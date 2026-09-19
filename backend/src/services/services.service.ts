import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateServiceStatusDto } from './dto/update-service-status.dto';
import { CompleteServiceDto } from './dto/complete-service.dto';

@Injectable()
export class ServicesService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.initReferenceTechnicians();
  }

  // Idempotent seeding of reference technicians in Employee table
  async initReferenceTechnicians() {
    try {
      const defaultTechs = [
        {
          employeeCode: 'EMP-TECH-01',
          fullName: 'Suresh V',
          designation: 'Senior AC Technician',
          department: 'Service & Operations',
          phone: '9884955011',
          email: 'suresh.v@freezetechnology.in',
          salary: 28000,
          joiningDate: new Date('2024-01-15'),
          status: 'ACTIVE',
        },
        {
          employeeCode: 'EMP-TECH-02',
          fullName: 'Muthu K',
          designation: 'AC Service Specialist',
          department: 'Service & Operations',
          phone: '9884012345',
          email: 'muthu.k@freezetechnology.in',
          salary: 26000,
          joiningDate: new Date('2024-03-01'),
          status: 'ACTIVE',
        },
        {
          employeeCode: 'EMP-TECH-03',
          fullName: 'Ramesh R',
          designation: 'Field Service Technician',
          department: 'Service & Operations',
          phone: '9790887766',
          email: 'ramesh.r@freezetechnology.in',
          salary: 24000,
          joiningDate: new Date('2024-06-10'),
          status: 'ACTIVE',
        },
        {
          employeeCode: 'EMP-TECH-04',
          fullName: 'Karthik P',
          designation: 'HVAC Technician',
          department: 'Service & Operations',
          phone: '9840998877',
          email: 'karthik.p@freezetechnology.in',
          salary: 25000,
          joiningDate: new Date('2024-08-01'),
          status: 'ACTIVE',
        },
      ];

      for (const tech of defaultTechs) {
        await this.prisma.employee.upsert({
          where: { employeeCode: tech.employeeCode },
          update: { fullName: tech.fullName, phone: tech.phone },
          create: tech,
        });
      }
    } catch (err) {
      console.warn('Technician initialization notice:', err.message);
    }
  }

  async getTechnicians() {
    return await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findAll(query?: ServiceQueryDto) {
    const search = query?.search?.trim();
    const status = query?.status?.trim();
    const priority = query?.priority?.trim();
    const technicianId = query?.technicianId?.trim();
    const customerId = query?.customerId?.trim();
    const productId = query?.productId?.trim();

    const whereClause: any = {};

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (priority && priority !== 'All') {
      whereClause.complaint = { ...whereClause.complaint, priority };
    }

    if (technicianId) {
      whereClause.technicianId = technicianId;
    }

    if (customerId) {
      whereClause.complaint = { ...whereClause.complaint, customerId };
    }

    if (productId) {
      whereClause.complaint = { ...whereClause.complaint, productId };
    }

    if (search) {
      whereClause.OR = [
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { complaint: { complaintNumber: { contains: search, mode: 'insensitive' } } },
        { complaint: { complaintDescription: { contains: search, mode: 'insensitive' } } },
        { complaint: { customer: { customerName: { contains: search, mode: 'insensitive' } } } },
        { complaint: { customer: { companyName: { contains: search, mode: 'insensitive' } } } },
        { complaint: { customer: { customerCode: { contains: search, mode: 'insensitive' } } } },
        { complaint: { customer: { mobile: { contains: search, mode: 'insensitive' } } } },
        { technician: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.jobCard.findMany({
      where: whereClause,
      include: {
        complaint: {
          include: {
            customer: true,
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
        technician: true,
        serviceHistory: {
          include: {
            technician: true,
          },
          orderBy: { completedAt: 'desc' },
        },
        serviceStatusLogs: {
          include: {
            updatedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { updatedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const jobCard = await this.prisma.jobCard.findFirst({
      where: {
        OR: [
          { id },
          { jobNumber: id },
          { complaintId: id },
          { complaint: { complaintNumber: id } },
        ],
      },
      include: {
        complaint: {
          include: {
            customer: true,
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
        technician: true,
        serviceHistory: {
          include: {
            technician: true,
          },
          orderBy: { completedAt: 'desc' },
        },
        serviceStatusLogs: {
          include: {
            updatedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { updatedAt: 'asc' },
        },
      },
    });

    if (!jobCard) {
      throw new NotFoundException(`Service Job Card "${id}" was not found.`);
    }

    return jobCard;
  }

  async create(dto: CreateServiceDto, userId?: string) {
    // 1. Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ id: dto.customerId }, { customerCode: dto.customerId }],
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer "${dto.customerId}" not found or inactive.`);
    }

    // 2. Verify product if specified
    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          OR: [{ id: dto.productId }, { sku: dto.productId }],
          deletedAt: null,
        },
      });
      if (!product) {
        throw new NotFoundException(`Product "${dto.productId}" not found.`);
      }
    }

    // 3. Resolve technician
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
    } else {
      const defaultTech = await this.prisma.employee.findFirst({
        where: { status: 'ACTIVE' },
      });
      if (!defaultTech) {
        await this.initReferenceTechnicians();
      }
      const tech = await this.prisma.employee.findFirst({ where: { status: 'ACTIVE' } });
      technicianId = tech?.id;
    }

    if (!technicianId) {
      throw new BadRequestException('No eligible technician available for service assignment.');
    }

    const effectiveUserId = await this.resolveUserId(userId);

    // 4. Transactional Complaint and JobCard creation
    return await this.prisma.$transaction(async (tx) => {
      const complaintNumber = await this.generateComplaintNumber(tx);
      const jobNumber = await this.generateJobNumber(tx);

      const initialStatus = dto.technicianId ? 'Assigned' : 'Pending';

      // Create Complaint
      const complaint = await tx.complaint.create({
        data: {
          complaintNumber,
          customerId: customer.id,
          productId: dto.productId || null,
          complaintDescription: dto.complaintDescription.trim(),
          priority: dto.priority || 'Medium',
          status: initialStatus === 'Assigned' ? 'In Progress' : 'Open',
        },
      });

      // Create JobCard
      const jobCard = await tx.jobCard.create({
        data: {
          jobNumber,
          complaintId: complaint.id,
          technicianId,
          visitDate: dto.visitDate ? new Date(dto.visitDate) : new Date(),
          status: initialStatus,
          estimatedCost: dto.estimatedCost !== undefined ? Number(dto.estimatedCost) : null,
          notes: dto.notes?.trim() || (dto.serviceType ? `Service Type: ${dto.serviceType}` : null),
        },
        include: {
          complaint: {
            include: { customer: true, product: true },
          },
          technician: true,
        },
      });

      // Create initial ServiceStatusLog
      if (effectiveUserId) {
        await tx.serviceStatusLog.create({
          data: {
            jobCardId: jobCard.id,
            previousStatus: 'None',
            currentStatus: initialStatus,
            updatedById: effectiveUserId,
          },
        });

        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Services',
              action: 'CREATE',
              recordId: jobCard.id,
            },
          });
        } catch {}
      }

      return jobCard;
    });
  }

  async update(id: string, dto: UpdateServiceDto, userId?: string) {
    const jobCard = await this.findById(id);
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      if (dto.complaintDescription || dto.priority) {
        await tx.complaint.update({
          where: { id: jobCard.complaintId },
          data: {
            complaintDescription: dto.complaintDescription || jobCard.complaint.complaintDescription,
            priority: dto.priority || jobCard.complaint.priority,
          },
        });
      }

      let updatedTechId = jobCard.technicianId;
      if (dto.technicianId && dto.technicianId !== jobCard.technicianId) {
        const tech = await tx.employee.findFirst({
          where: {
            OR: [{ id: dto.technicianId }, { employeeCode: dto.technicianId }],
            status: 'ACTIVE',
          },
        });
        if (!tech) {
          throw new NotFoundException(`Technician "${dto.technicianId}" not found.`);
        }
        updatedTechId = tech.id;
      }

      const updatedJob = await tx.jobCard.update({
        where: { id: jobCard.id },
        data: {
          technicianId: updatedTechId,
          visitDate: dto.visitDate ? new Date(dto.visitDate) : jobCard.visitDate,
          estimatedCost:
            dto.estimatedCost !== undefined ? Number(dto.estimatedCost) : jobCard.estimatedCost,
          actualCost: dto.actualCost !== undefined ? Number(dto.actualCost) : jobCard.actualCost,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : jobCard.notes,
        },
        include: {
          complaint: { include: { customer: true, product: true } },
          technician: true,
          serviceHistory: true,
          serviceStatusLogs: true,
        },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Services',
              action: 'UPDATE',
              recordId: updatedJob.id,
            },
          });
        } catch {}
      }

      return updatedJob;
    });
  }

  async assignTechnician(id: string, dto: AssignTechnicianDto, userId?: string) {
    const jobCard = await this.findById(id);

    const tech = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id: dto.technicianId }, { employeeCode: dto.technicianId }],
        status: 'ACTIVE',
      },
    });

    if (!tech) {
      throw new NotFoundException(`Technician "${dto.technicianId}" not found or inactive.`);
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      const prevStatus = jobCard.status;
      const newStatus = prevStatus === 'Pending' ? 'Assigned' : prevStatus;

      const updatedJob = await tx.jobCard.update({
        where: { id: jobCard.id },
        data: {
          technicianId: tech.id,
          visitDate: dto.visitDate ? new Date(dto.visitDate) : jobCard.visitDate,
          status: newStatus,
          notes: dto.notes ? `${jobCard.notes || ''}\n${dto.notes}`.trim() : jobCard.notes,
        },
        include: {
          complaint: { include: { customer: true, product: true } },
          technician: true,
          serviceHistory: true,
          serviceStatusLogs: true,
        },
      });

      if (prevStatus !== newStatus && effectiveUserId) {
        await tx.serviceStatusLog.create({
          data: {
            jobCardId: jobCard.id,
            previousStatus: prevStatus,
            currentStatus: newStatus,
            updatedById: effectiveUserId,
          },
        });
      }

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Services',
              action: 'ASSIGN_TECHNICIAN',
              recordId: jobCard.id,
            },
          });
        } catch {}
      }

      return updatedJob;
    });
  }

  async updateStatus(id: string, dto: UpdateServiceStatusDto, userId?: string) {
    const jobCard = await this.findById(id);
    const prevStatus = jobCard.status;
    const newStatus = dto.status;

    if (prevStatus === newStatus) {
      return jobCard;
    }

    // Lifecycle validation
    if (prevStatus === 'Completed' || prevStatus === 'Cancelled') {
      throw new BadRequestException(
        `Cannot change status of a job card that is already ${prevStatus}.`,
      );
    }

    if (newStatus === 'Completed') {
      throw new BadRequestException(
        'Please use the completion workflow (/api/services/:id/complete) to record work done and actual charges.',
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      const updatedJob = await tx.jobCard.update({
        where: { id: jobCard.id },
        data: {
          status: newStatus,
          notes: dto.remarks ? `${jobCard.notes || ''}\nStatus update: ${dto.remarks}`.trim() : jobCard.notes,
        },
        include: {
          complaint: { include: { customer: true, product: true } },
          technician: true,
          serviceHistory: true,
          serviceStatusLogs: true,
        },
      });

      if (newStatus === 'In Progress') {
        await tx.complaint.update({
          where: { id: jobCard.complaintId },
          data: { status: 'In Progress' },
        });
      } else if (newStatus === 'Cancelled') {
        await tx.complaint.update({
          where: { id: jobCard.complaintId },
          data: { status: 'Cancelled' },
        });
      }

      if (effectiveUserId) {
        await tx.serviceStatusLog.create({
          data: {
            jobCardId: jobCard.id,
            previousStatus: prevStatus,
            currentStatus: newStatus,
            updatedById: effectiveUserId,
          },
        });

        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Services',
              action: 'STATUS_UPDATE',
              recordId: jobCard.id,
            },
          });
        } catch {}
      }

      return updatedJob;
    });
  }

  async completeService(id: string, dto: CompleteServiceDto, userId?: string) {
    const jobCard = await this.findById(id);

    if (jobCard.status === 'Completed') {
      throw new BadRequestException('This service job card has already been completed.');
    }

    if (jobCard.status === 'Cancelled') {
      throw new BadRequestException('Cannot complete a cancelled job card.');
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Record ServiceHistory
      const serviceHistory = await tx.serviceHistory.create({
        data: {
          jobCardId: jobCard.id,
          technicianId: jobCard.technicianId,
          workDone: dto.workDone.trim(),
          sparePartsUsed: dto.sparePartsUsed?.trim() || null,
          customerSignature: dto.customerSignature || null,
          completedAt: new Date(),
        },
      });

      // 2. Update JobCard to Completed
      const updatedJob = await tx.jobCard.update({
        where: { id: jobCard.id },
        data: {
          status: 'Completed',
          actualCost: dto.actualCost !== undefined ? Number(dto.actualCost) : (jobCard.actualCost || jobCard.estimatedCost || 0),
          notes: dto.notes ? `${jobCard.notes || ''}\nCompletion notes: ${dto.notes}`.trim() : jobCard.notes,
        },
        include: {
          complaint: { include: { customer: true, product: true } },
          technician: true,
          serviceHistory: true,
          serviceStatusLogs: true,
        },
      });

      // 3. Close Complaint
      await tx.complaint.update({
        where: { id: jobCard.complaintId },
        data: { status: 'Closed' },
      });

      // 4. Log status history
      if (effectiveUserId) {
        await tx.serviceStatusLog.create({
          data: {
            jobCardId: jobCard.id,
            previousStatus: jobCard.status,
            currentStatus: 'Completed',
            updatedById: effectiveUserId,
          },
        });

        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Services',
              action: 'COMPLETE',
              recordId: jobCard.id,
            },
          });
        } catch {}
      }

      return updatedJob;
    });
  }

  async createInvoiceFromService(id: string, userId?: string) {
    const jobCard = await this.findById(id);

    if (jobCard.status !== 'Completed') {
      throw new BadRequestException(
        `Job card "${jobCard.jobNumber}" must be completed before generating an invoice (Current status: ${jobCard.status}).`,
      );
    }

    // Duplicate check: check if an invoice with matching complaint/jobcard reference already exists
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        customerId: jobCard.complaint.customerId,
        deletedAt: null,
        items: {
          some: {
            description: { contains: jobCard.jobNumber },
          },
        },
      },
    });

    if (existingInvoice) {
      throw new ConflictException(
        `Invoice ${existingInvoice.invoiceNumber} has already been generated for Job Card ${jobCard.jobNumber}.`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      const chargeAmount = Number(jobCard.actualCost || jobCard.estimatedCost || 1500);
      const gstAmount = Number(((chargeAmount * 18) / 100).toFixed(2));
      const grandTotal = Number((chargeAmount + gstAmount).toFixed(2));

      const invoiceNumber = await this.generateInvoiceNumber(tx);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: jobCard.complaint.customerId,
          invoiceDate: new Date(),
          subtotal: chargeAmount,
          discount: 0,
          gstAmount,
          grandTotal,
          paymentStatus: 'Pending',
          paymentMethod: 'UPI',
          createdById: effectiveUserId || (await this.resolveUserId()),
          items: {
            create: [
              {
                productId: jobCard.complaint.productId || (await this.resolveServiceProductId(tx)),
                description: `Service Charges: ${jobCard.complaint.complaintDescription} (Job Ref: ${jobCard.jobNumber})`,
                quantity: 1,
                sellingPrice: chargeAmount,
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

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Invoices',
              action: 'CREATE_FROM_SERVICE',
              recordId: invoice.id,
            },
          });
        } catch {}
      }

      return invoice;
    });
  }

  async remove(id: string, userId?: string) {
    const jobCard = await this.findById(id);
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      await tx.jobCard.update({
        where: { id: jobCard.id },
        data: { status: 'Cancelled' },
      });

      await tx.complaint.update({
        where: { id: jobCard.complaintId },
        data: { status: 'Cancelled' },
      });

      if (effectiveUserId) {
        await tx.serviceStatusLog.create({
          data: {
            jobCardId: jobCard.id,
            previousStatus: jobCard.status,
            currentStatus: 'Cancelled',
            updatedById: effectiveUserId,
          },
        });
      }

      return {
        success: true,
        message: `Service Job Card ${jobCard.jobNumber} has been cancelled.`,
      };
    });
  }

  async getStats() {
    const jobs = await this.prisma.jobCard.findMany({
      include: { complaint: true },
    });

    const total = jobs.length;
    const pending = jobs.filter((j) => j.status === 'Pending').length;
    const assigned = jobs.filter((j) => j.status === 'Assigned').length;
    const inProgress = jobs.filter((j) => j.status === 'In Progress').length;
    const completed = jobs.filter((j) => j.status === 'Completed').length;
    const cancelled = jobs.filter((j) => j.status === 'Cancelled').length;
    const highPriority = jobs.filter(
      (j) => j.complaint?.priority === 'High' || j.complaint?.priority === 'Critical',
    ).length;

    return {
      total,
      pending,
      assigned,
      inProgress,
      completed,
      cancelled,
      highPriority,
    };
  }

  private async generateComplaintNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.complaint.count();
    const seq = String(count + 1).padStart(4, '0');
    return `CMP-${year}-${seq}`;
  }

  private async generateJobNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.jobCard.count();
    const seq = String(count + 1).padStart(4, '0');
    return `JC-${year}-${seq}`;
  }

  private async generateInvoiceNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.invoice.count();
    const seq = String(count + 1).padStart(4, '0');
    return `FT/${year}/${seq}`;
  }

  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user.id;
    }
    const admin = await this.prisma.user.findFirst({ where: { status: 'ACTIVE' } });
    return admin?.id || 'usr-admin-01';
  }

  private async resolveServiceProductId(tx: any): Promise<string> {
    const serviceProd = await tx.product.findFirst({
      where: {
        OR: [{ category: { categoryName: 'Service' } }, { sku: { contains: 'SRV' } }],
        deletedAt: null,
      },
    });
    if (serviceProd) return serviceProd.id;

    const anyProd = await tx.product.findFirst({ where: { deletedAt: null } });
    return anyProd?.id || 'prod-default';
  }
}
