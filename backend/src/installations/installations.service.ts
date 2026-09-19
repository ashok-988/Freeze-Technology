import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstallationDto } from './dto/create-installation.dto';
import { UpdateInstallationDto } from './dto/update-installation.dto';
import { InstallationQueryDto } from './dto/installation-query.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateInstallationStatusDto } from './dto/update-installation-status.dto';
import { CompleteInstallationDto } from './dto/complete-installation.dto';

@Injectable()
export class InstallationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: InstallationQueryDto) {
    const { search, status, customerId, technicianId, productId } = query;

    const where: any = {};

    if (status && status !== 'All') {
      where.installationStatus = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (productId) {
      where.productId = productId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { installationNumber: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { customer: { customerName: { contains: q, mode: 'insensitive' } } },
        { customer: { companyName: { contains: q, mode: 'insensitive' } } },
        { customer: { customerCode: { contains: q, mode: 'insensitive' } } },
        { customer: { mobile: { contains: q, mode: 'insensitive' } } },
        { product: { productName: { contains: q, mode: 'insensitive' } } },
        { product: { sku: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.installation.findMany({
      where,
      include: {
        customer: true,
        product: {
          include: { category: true, brand: true },
        },
        technician: true,
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const installation = await this.prisma.installation.findFirst({
      where: {
        OR: [{ id }, { installationNumber: id }],
      },
      include: {
        customer: {
          include: {
            complaints: true,
            amcContracts: true,
            invoices: true,
          },
        },
        product: {
          include: { category: true, brand: true },
        },
        technician: true,
        invoice: {
          include: { items: true, payments: true },
        },
      },
    });

    if (!installation) {
      throw new NotFoundException(`Installation record "${id}" not found.`);
    }

    return installation;
  }

  async getStats() {
    const installations = await this.prisma.installation.findMany({
      include: { customer: true, product: true },
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = installations.length;
    const pending = installations.filter((i) => i.installationStatus === 'Pending').length;
    const assigned = installations.filter((i) => i.installationStatus === 'Assigned').length;
    const scheduled = installations.filter((i) => i.installationStatus === 'Scheduled').length;
    const inProgress = installations.filter((i) => i.installationStatus === 'In Progress').length;
    const completed = installations.filter((i) => i.installationStatus === 'Completed').length;
    const cancelled = installations.filter((i) => i.installationStatus === 'Cancelled').length;

    const thisMonth = installations.filter((i) => new Date(i.createdAt) >= firstDayOfMonth).length;

    return {
      total,
      pending,
      assigned,
      scheduled,
      inProgress,
      completed,
      cancelled,
      thisMonth,
    };
  }

  async create(dto: CreateInstallationDto, userId?: string) {
    // 1. Validate customer
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer "${dto.customerId}" not found.`);
    }

    // 2. Validate product if provided
    let product: any = null;
    if (dto.productId) {
      product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product / Equipment "${dto.productId}" not found.`);
      }
    } else {
      product = await this.prisma.product.findFirst();
    }

    // 3. Validate technician if provided
    let technicianId = dto.technicianId;
    if (technicianId) {
      const tech = await this.prisma.employee.findFirst({
        where: {
          OR: [{ id: technicianId }, { employeeCode: technicianId }],
          status: 'ACTIVE',
        },
      });
      if (!tech) {
        throw new NotFoundException(`Technician "${technicianId}" not found or inactive.`);
      }
      technicianId = tech.id;
    }

    // 4. Validate dates
    let installationDate: Date | null = null;
    if (dto.installationDate) {
      installationDate = new Date(dto.installationDate);
      if (isNaN(installationDate.getTime())) {
        throw new BadRequestException('Invalid installation date format.');
      }
    }

    // Determine initial status
    let initialStatus = dto.installationStatus || 'Pending';
    if (!dto.installationStatus) {
      if (technicianId && installationDate) {
        initialStatus = 'Scheduled';
      } else if (technicianId) {
        initialStatus = 'Assigned';
      }
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const installationNumber = await this.generateInstallationNumber(tx);

        const installation = await tx.installation.create({
          data: {
            installationNumber,
            customerId: customer.id,
            productId: product?.id || null,
            invoiceId: dto.invoiceId || null,
            technicianId: technicianId || null,
            installationDate,
            installationStatus: initialStatus,
            customerVerified: false,
            notes: dto.notes?.trim() || null,
          },
          include: {
            customer: true,
            product: { include: { category: true, brand: true } },
            technician: true,
            invoice: true,
          },
        });

        // If scheduled, automatically create linked Complaint & JobCard
        if (initialStatus === 'Scheduled' && installationDate) {
          try {
            const complaintNumber = await this.generateComplaintNumber(tx);
            const complaint = await tx.complaint.create({
              data: {
                complaintNumber,
                customerId: customer.id,
                productId: product?.id || null,
                complaintDescription: `New AC Installation & Commissioning (${installationNumber})`,
                priority: 'High',
                status: 'In Progress',
              },
            });

            const jobNumber = await this.generateJobNumber(tx);
            await tx.jobCard.create({
              data: {
                jobNumber,
                complaintId: complaint.id,
                technicianId: technicianId || (await this.resolveDefaultTechId(tx)),
                visitDate: installationDate,
                status: 'Assigned',
                estimatedCost: 2500,
                notes: `Installation: ${installationNumber}\n${dto.notes || 'Site installation and commissioning work'}`.trim(),
              },
            });
          } catch (e) {
            console.warn('Notice: Installation auto job card notice:', e.message);
          }
        }

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Installations',
                action: 'CREATE',
                recordId: installation.id,
              },
            });
          } catch {}
        }

        return installation;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async update(id: string, dto: UpdateInstallationDto, userId?: string) {
    const installation = await this.findById(id);

    if (installation.installationStatus === 'Cancelled') {
      throw new BadRequestException('Cannot update a cancelled installation.');
    }

    if (dto.productId) {
      const prod = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!prod) throw new NotFoundException(`Product "${dto.productId}" not found.`);
    }

    let technicianId = dto.technicianId;
    if (technicianId) {
      const tech = await this.prisma.employee.findFirst({
        where: {
          OR: [{ id: technicianId }, { employeeCode: technicianId }],
          status: 'ACTIVE',
        },
      });
      if (!tech) throw new NotFoundException(`Technician "${technicianId}" not found or inactive.`);
      technicianId = tech.id;
    }

    let installationDate = installation.installationDate;
    if (dto.installationDate) {
      installationDate = new Date(dto.installationDate);
      if (isNaN(installationDate.getTime())) {
        throw new BadRequestException('Invalid installation date format.');
      }
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.installation.update({
          where: { id: installation.id },
          data: {
            productId: dto.productId !== undefined ? dto.productId : installation.productId,
            invoiceId: dto.invoiceId !== undefined ? dto.invoiceId : installation.invoiceId,
            technicianId: technicianId !== undefined ? technicianId : installation.technicianId,
            installationDate,
            installationStatus: dto.installationStatus || installation.installationStatus,
            customerVerified:
              dto.customerVerified !== undefined ? dto.customerVerified : installation.customerVerified,
            notes: dto.notes !== undefined ? dto.notes?.trim() : installation.notes,
          },
          include: {
            customer: true,
            product: { include: { category: true, brand: true } },
            technician: true,
            invoice: true,
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Installations',
                action: 'UPDATE',
                recordId: updated.id,
              },
            });
          } catch {}
        }

        return updated;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async assignTechnician(id: string, dto: AssignTechnicianDto, userId?: string) {
    const installation = await this.findById(id);

    if (installation.installationStatus === 'Completed') {
      throw new BadRequestException('Cannot assign technician to an already completed installation.');
    }
    if (installation.installationStatus === 'Cancelled') {
      throw new BadRequestException('Cannot assign technician to a cancelled installation.');
    }

    const tech = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id: dto.technicianId }, { employeeCode: dto.technicianId }],
        status: 'ACTIVE',
      },
    });
    if (!tech) {
      throw new NotFoundException(`Technician "${dto.technicianId}" not found or inactive.`);
    }

    let scheduledDate = installation.installationDate;
    if (dto.scheduledDate) {
      scheduledDate = new Date(dto.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        throw new BadRequestException('Invalid scheduled date format.');
      }
    }

    const newStatus = scheduledDate ? 'Scheduled' : 'Assigned';
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.installation.update({
          where: { id: installation.id },
          data: {
            technicianId: tech.id,
            installationDate: scheduledDate,
            installationStatus: newStatus,
            notes: dto.instructions
              ? `${installation.notes ? installation.notes + '\n' : ''}Instructions: ${dto.instructions}`.trim()
              : installation.notes,
          },
          include: {
            customer: true,
            product: { include: { category: true, brand: true } },
            technician: true,
            invoice: true,
          },
        });

        // Automatically create or link JobCard
        if (scheduledDate) {
          try {
            const complaintNumber = await this.generateComplaintNumber(tx);
            const complaint = await tx.complaint.create({
              data: {
                complaintNumber,
                customerId: installation.customerId,
                productId: installation.productId,
                complaintDescription: `New AC Installation (${installation.installationNumber}) - ${tech.fullName}`,
                priority: 'High',
                status: 'In Progress',
              },
            });

            const jobNumber = await this.generateJobNumber(tx);
            await tx.jobCard.create({
              data: {
                jobNumber,
                complaintId: complaint.id,
                technicianId: tech.id,
                visitDate: scheduledDate,
                status: 'Assigned',
                estimatedCost: 2500,
                notes: `Installation ${installation.installationNumber}\n${dto.instructions || ''}`.trim(),
              },
            });
          } catch (e) {
            console.warn('Notice: JobCard creation during assign notice:', e.message);
          }
        }

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Installations',
                action: 'ASSIGN_TECHNICIAN',
                recordId: installation.id,
              },
            });
          } catch {}
        }

        return updated;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async updateStatus(id: string, dto: UpdateInstallationStatusDto, userId?: string) {
    const installation = await this.findById(id);

    // Validate lifecycle transitions
    const current = installation.installationStatus;
    const next = dto.status;

    if (current === 'Completed') {
      throw new BadRequestException('Installation has already been Completed and cannot change status.');
    }
    if (current === 'Cancelled') {
      throw new BadRequestException('Installation has been Cancelled and cannot change status.');
    }

    const validTransitions: Record<string, string[]> = {
      Pending: ['Assigned', 'Scheduled', 'In Progress', 'Cancelled'],
      Assigned: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      Scheduled: ['In Progress', 'Completed', 'Cancelled'],
      'In Progress': ['Completed', 'Cancelled'],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid status transition from "${current}" to "${next}". Allowed transitions: ${allowed.join(', ')}`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const dataToUpdate: any = {
          installationStatus: next,
        };

        if (next === 'Completed') {
          dataToUpdate.completedDate = new Date();
          dataToUpdate.customerVerified = true;
        }

        if (dto.notes) {
          dataToUpdate.notes = `${installation.notes ? installation.notes + '\n' : ''}${dto.notes}`.trim();
        }

        const updated = await tx.installation.update({
          where: { id: installation.id },
          data: dataToUpdate,
          include: {
            customer: true,
            product: { include: { category: true, brand: true } },
            technician: true,
            invoice: true,
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Installations',
                action: 'STATUS_CHANGE',
                recordId: installation.id,
              },
            });
          } catch {}
        }

        return updated;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async complete(id: string, dto: CompleteInstallationDto, userId?: string) {
    const installation = await this.findById(id);

    if (installation.installationStatus === 'Completed') {
      throw new BadRequestException(
        `Installation ${installation.installationNumber} has already been completed. Duplicate completion rejected.`,
      );
    }
    if (installation.installationStatus === 'Cancelled') {
      throw new BadRequestException(`Cannot complete a cancelled installation.`);
    }

    let completedDate = new Date();
    if (dto.completedDate) {
      completedDate = new Date(dto.completedDate);
      if (isNaN(completedDate.getTime())) {
        throw new BadRequestException('Invalid completed date format.');
      }
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        let updatedNotes = installation.notes || '';
        if (dto.commissioningNotes) {
          updatedNotes = `${updatedNotes}\nCommissioning: ${dto.commissioningNotes}`.trim();
        }
        if (dto.technicianRemarks) {
          updatedNotes = `${updatedNotes}\nTech Remarks: ${dto.technicianRemarks}`.trim();
        }

        const updated = await tx.installation.update({
          where: { id: installation.id },
          data: {
            installationStatus: 'Completed',
            completedDate,
            customerVerified: dto.customerVerified !== undefined ? dto.customerVerified : true,
            notes: updatedNotes,
          },
          include: {
            customer: true,
            product: { include: { category: true, brand: true } },
            technician: true,
            invoice: true,
          },
        });

        // Record ServiceHistory if linked JobCard exists
        try {
          const complaint = await tx.complaint.findFirst({
            where: {
              customerId: installation.customerId,
              complaintDescription: { contains: installation.installationNumber },
            },
            include: { jobCard: true },
          });

          if (complaint?.jobCard) {
            await tx.jobCard.update({
              where: { id: complaint.jobCard.id },
              data: {
                status: 'Completed',
                actualCost: dto.actualCost || 2500,
              },
            });

            await tx.serviceHistory.create({
              data: {
                jobCardId: complaint.jobCard.id,
                technicianId: installation.technicianId || (await this.resolveDefaultTechId(tx)),
                workDone: `Equipment installed, gas level verified, commissioning and test run successful. ${dto.commissioningNotes || ''}`.trim(),
                sparePartsUsed: 'Copper Piping Kit, Mounting Brackets, Vibration Pads',
                customerSignature: 'Verified by Customer',
                completedAt: completedDate,
              },
            });
          }
        } catch (e) {
          console.warn('Notice: JobCard completion notice:', e.message);
        }

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Installations',
                action: 'COMPLETE',
                recordId: installation.id,
              },
            });
          } catch {}
        }

        return updated;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async createInvoice(id: string, userId?: string) {
    const installation = await this.findById(id);

    // Duplicate check
    if (installation.invoiceId || installation.invoice) {
      throw new ConflictException(
        `Invoice ${installation.invoice?.invoiceNumber || installation.invoiceId} has already been generated for installation ${installation.installationNumber}.`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const installCharge = 2500; // Standard AC installation charge
        const gstAmount = Number(((installCharge * 18) / 100).toFixed(2)); // 450
        const grandTotal = Number((installCharge + gstAmount).toFixed(2)); // 2950

        const invoiceNumber = await this.generateInvoiceNumber(tx);

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId: installation.customerId,
            invoiceDate: new Date(),
            subtotal: installCharge,
            discount: 0,
            gstAmount,
            grandTotal,
            paymentStatus: 'Pending',
            paymentMethod: 'Bank Transfer',
            createdById: effectiveUserId || (await this.resolveUserId()),
            items: {
              create: [
                {
                  productId: installation.productId || (await this.resolveDefaultProductId(tx)),
                  description: `Site Installation & Commissioning Charges (${installation.installationNumber}) — ${installation.product?.productName || 'AC Unit'}`,
                  quantity: 1,
                  sellingPrice: installCharge,
                  taxAmount: gstAmount,
                  total: grandTotal,
                },
              ],
            },
          },
          include: {
            customer: true,
            items: true,
          },
        });

        // Link invoice to installation
        await tx.installation.update({
          where: { id: installation.id },
          data: { invoiceId: invoice.id },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Invoices',
                action: 'CREATE_FROM_INSTALLATION',
                recordId: invoice.id,
              },
            });
          } catch {}
        }

        return invoice;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async remove(id: string, userId?: string) {
    const installation = await this.findById(id);
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        await tx.installation.update({
          where: { id: installation.id },
          data: { installationStatus: 'Cancelled' },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Installations',
                action: 'CANCEL',
                recordId: installation.id,
              },
            });
          } catch {}
        }

        return {
          success: true,
          message: `Installation ${installation.installationNumber} has been cancelled.`,
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  // --- Private Generators & Resolvers ---

  private async generateInstallationNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const last = await tx.installation.findFirst({
      where: { installationNumber: { startsWith: `INST-${year}-` } },
      orderBy: { installationNumber: 'desc' },
      select: { installationNumber: true },
    });
    if (!last || !last.installationNumber) return `INST-${year}-0001`;
    const parts = last.installationNumber.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `INST-${year}-${String(seq).padStart(4, '0')}`;
  }

  private async generateInvoiceNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const last = await tx.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `FT/${year}/` } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    if (!last) return `FT/${year}/0001`;
    const parts = last.invoiceNumber.split('/');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `FT/${year}/${String(seq).padStart(4, '0')}`;
  }

  private async generateComplaintNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const last = await tx.complaint.findFirst({
      where: { complaintNumber: { startsWith: `CMP-${year}-` } },
      orderBy: { complaintNumber: 'desc' },
      select: { complaintNumber: true },
    });
    if (!last) return `CMP-${year}-0001`;
    const parts = last.complaintNumber.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `CMP-${year}-${String(seq).padStart(4, '0')}`;
  }

  private async generateJobNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const last = await tx.jobCard.findFirst({
      where: { jobNumber: { startsWith: `JC-${year}-` } },
      orderBy: { jobNumber: 'desc' },
      select: { jobNumber: true },
    });
    if (!last) return `JC-${year}-0001`;
    const parts = last.jobNumber.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `JC-${year}-${String(seq).padStart(4, '0')}`;
  }

  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user.id;
    }
    const admin = await this.prisma.user.findFirst({ where: { status: 'ACTIVE' } });
    return admin?.id || 'usr-admin-01';
  }

  private async resolveDefaultTechId(tx: any): Promise<string> {
    const tech = await tx.employee.findFirst({ where: { status: 'ACTIVE' } });
    return tech?.id || 'emp-tech-01';
  }

  private async resolveDefaultProductId(tx: any): Promise<string> {
    const prod = await tx.product.findFirst();
    return prod?.id;
  }
}
