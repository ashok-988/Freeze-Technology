import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAmcDto } from './dto/create-amc.dto';
import { UpdateAmcDto } from './dto/update-amc.dto';
import { AmcQueryDto } from './dto/amc-query.dto';
import { ScheduleAmcVisitDto } from './dto/schedule-amc-visit.dto';
import { UpdateAmcStatusDto } from './dto/update-amc-status.dto';
import { RenewAmcDto } from './dto/renew-amc.dto';
import { GenerateAmcBillingDto } from './dto/amc-billing-generate.dto';

@Injectable()
export class AMCService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: AmcQueryDto) {
    const search = query?.search?.trim();
    const status = query?.status?.trim();
    const customerId = query?.customerId?.trim();
    const productId = query?.productId?.trim();

    const whereClause: any = {};

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (productId) {
      whereClause.productId = productId;
    }

    if (search) {
      whereClause.OR = [
        { amcNumber: { contains: search, mode: 'insensitive' } },
        { customer: { customerName: { contains: search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { customerCode: { contains: search, mode: 'insensitive' } } },
        { customer: { mobile: { contains: search, mode: 'insensitive' } } },
        { product: { productName: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.aMCContract.findMany({
      where: whereClause,
      include: {
        customer: true,
        product: {
          include: { category: true, brand: true },
        },
        assignedTechnician: true,
        coveredAssets: {
          include: { asset: { include: { product: true } } },
        },
        billingSchedules: {
          include: { invoice: { include: { payments: true } } },
          orderBy: { billingPeriodNumber: 'asc' },
        },
        visits: {
          include: { technician: true },
          orderBy: { visitNumber: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(id: string) {
    const contract = await this.prisma.aMCContract.findFirst({
      where: {
        OR: [{ id }, { amcNumber: id }],
      },
      include: {
        customer: true,
        product: {
          include: { category: true, brand: true },
        },
        assignedTechnician: true,
        coveredAssets: {
          include: { asset: { include: { product: true } } },
        },
        billingSchedules: {
          include: { invoice: { include: { payments: true } } },
          orderBy: { billingPeriodNumber: 'asc' },
        },
        pmSchedules: {
          include: { technician: true, asset: true },
          orderBy: { plannedDate: 'asc' },
        },
        visits: {
          include: { technician: true },
          orderBy: { visitNumber: 'asc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`AMC Contract "${id}" was not found.`);
    }

    return contract;
  }

  async create(dto: CreateAmcDto, userId?: string) {
    // 1. Verify customer
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ id: dto.customerId }, { customerCode: dto.customerId }],
        deletedAt: null,
      },
    });
    if (!customer) {
      throw new NotFoundException(`Customer "${dto.customerId}" not found.`);
    }

    // 2. Verify product
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: dto.productId }, { sku: dto.productId }],
        deletedAt: null,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product / Equipment "${dto.productId}" not found.`);
    }

    // 3. Date validation
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start or end date format.');
    }
    if (end <= start) {
      throw new BadRequestException('Contract end date must be after start date.');
    }

    const totalVisits = Number(dto.totalVisits) || 4;
    const contractVal = Number(dto.contractValue) || 0;
    const gstRate = Number(dto.gstRate) || 18.0;
    const gstAmount = Number(((contractVal * gstRate) / 100).toFixed(2));
    const totalAmount = Number((contractVal + gstAmount).toFixed(2));

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const amcNumber = await this.generateAmcNumber(tx);

        const contract = await tx.aMCContract.create({
          data: {
            amcNumber,
            customerId: customer.id,
            productId: product.id,
            startDate: start,
            endDate: end,
            totalVisits,
            completedVisits: 0,
            remainingVisits: totalVisits,
            status: 'Active',
            contractType: dto.contractType || 'COMPREHENSIVE',
            contractValue: contractVal,
            gstRate,
            taxableAmount: contractVal,
            gstAmount,
            totalAmount,
            serviceFrequency: dto.serviceFrequency || 'QUARTERLY',
            billingFrequency: dto.billingFrequency || 'QUARTERLY',
            billingStatus: contractVal > 0 ? 'PENDING' : 'FULLY_BILLED',
            assignedTechnicianId: dto.assignedTechnicianId || null,
            terms: dto.terms || null,
            notes: dto.notes || null,
          },
          include: {
            customer: true,
            product: true,
            visits: true,
          },
        });

        // Link covered assets if provided
        const rawAssetIds = dto.assetIds || dto.coveredAssetIds || [];
        if (rawAssetIds.length > 0) {
          for (const assetId of rawAssetIds) {
            const ast = await tx.asset.findFirst({
              where: { OR: [{ id: assetId }, { assetNumber: assetId }], deletedAt: null },
            });
            if (ast) {
              await tx.aMCContractAsset.create({
                data: {
                  amcContractId: contract.id,
                  assetId: ast.id,
                },
              });
              await tx.asset.update({
                where: { id: ast.id },
                data: { amcStatus: 'COVERED' },
              });
            }
          }
        }

        // Auto-generate billing schedules if contractValue > 0
        if (contractVal > 0) {
          await this.createBillingSchedulesForContract(contract, tx);
        }

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'AMC',
                action: 'CREATE',
                recordId: contract.id,
              },
            });
          } catch {}
        }

        return await tx.aMCContract.findUnique({
          where: { id: contract.id },
          include: {
            customer: true,
            product: true,
            assignedTechnician: true,
            coveredAssets: { include: { asset: true } },
            billingSchedules: true,
            visits: true,
          },
        });
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async update(id: string, dto: UpdateAmcDto, userId?: string) {
    const contract = await this.findById(id);
    const effectiveUserId = await this.resolveUserId(userId);

    let start = contract.startDate;
    let end = contract.endDate;

    if (dto.startDate) {
      start = new Date(dto.startDate);
    }
    if (dto.endDate) {
      end = new Date(dto.endDate);
    }
    if (end <= start) {
      throw new BadRequestException('Contract end date must be after start date.');
    }

    const totalVisits = dto.totalVisits !== undefined ? Number(dto.totalVisits) : contract.totalVisits;
    const remainingVisits = Math.max(0, totalVisits - contract.completedVisits);

    return await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.aMCContract.update({
          where: { id: contract.id },
          data: {
            startDate: start,
            endDate: end,
            totalVisits,
            remainingVisits,
            status: dto.status || contract.status,
          },
          include: {
            customer: true,
            product: true,
            visits: { include: { technician: true } },
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'AMC',
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

  async scheduleVisit(id: string, dto: ScheduleAmcVisitDto, userId?: string) {
    const contract = await this.findById(id);

    if (contract.status === 'Cancelled' || contract.status === 'Expired') {
      throw new BadRequestException(
        `Cannot schedule maintenance visit for an AMC contract that is ${contract.status}.`,
      );
    }

    if (contract.remainingVisits <= 0) {
      throw new BadRequestException(
        `All ${contract.totalVisits} included maintenance visits for contract ${contract.amcNumber} have already been consumed.`,
      );
    }

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
      const defaultTech = await this.prisma.employee.findFirst({ where: { status: 'ACTIVE' } });
      technicianId = defaultTech?.id;
    }

    const scheduledDate = new Date(dto.scheduledDate);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduled visit date format.');
    }

    const visitNumber = contract.visits.length + 1;
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const visit = await tx.aMCVisit.create({
          data: {
            amcContractId: contract.id,
            visitNumber,
            scheduledDate,
            technicianId: technicianId || null,
            remarks: dto.remarks?.trim() || `Quarterly AMC Service Visit #${visitNumber}`,
          },
          include: { technician: true },
        });

        try {
          const complaintNumber = await this.generateComplaintNumber(tx);
          const complaint = await tx.complaint.create({
            data: {
              complaintNumber,
              customerId: contract.customerId,
              productId: contract.productId,
              complaintDescription: `AMC Routine Maintenance Visit #${visitNumber} (${contract.amcNumber})`,
              priority: 'Medium',
              status: 'In Progress',
            },
          });

          const jobNumber = await this.generateJobNumber(tx);
          await tx.jobCard.create({
            data: {
              jobNumber,
              complaintId: complaint.id,
              technicianId: technicianId || (await this.resolveDefaultTechId(tx)),
              visitDate: scheduledDate,
              status: 'Assigned',
              estimatedCost: 0,
              notes: `AMC Contract: ${contract.amcNumber} (Visit #${visitNumber})\n${dto.remarks || ''}`.trim(),
            },
          });
        } catch (e) {
          console.warn('Notice: AMC auto jobcard creation notice:', e.message);
        }

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'AMC',
                action: 'SCHEDULE_VISIT',
                recordId: visit.id,
              },
            });
          } catch {}
        }

        return await tx.aMCContract.findUnique({
          where: { id: contract.id },
          include: {
            customer: true,
            product: true,
            visits: { include: { technician: true }, orderBy: { visitNumber: 'asc' } },
          },
        });
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async completeVisit(amcId: string, visitId: string, userId?: string) {
    const contract = await this.findById(amcId);
    const visit = contract.visits.find((v) => v.id === visitId || String(v.visitNumber) === visitId);

    if (!visit) {
      throw new NotFoundException(`AMC Visit "${visitId}" not found for contract ${contract.amcNumber}.`);
    }

    if (visit.completedDate) {
      throw new BadRequestException(`AMC Visit #${visit.visitNumber} has already been marked as completed.`);
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        await tx.aMCVisit.update({
          where: { id: visit.id },
          data: { completedDate: new Date() },
        });

        const completedVisits = contract.completedVisits + 1;
        const remainingVisits = Math.max(0, contract.totalVisits - completedVisits);

        const updated = await tx.aMCContract.update({
          where: { id: contract.id },
          data: {
            completedVisits,
            remainingVisits,
          },
          include: {
            customer: true,
            product: true,
            visits: { include: { technician: true }, orderBy: { visitNumber: 'asc' } },
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'AMC',
                action: 'COMPLETE_VISIT',
                recordId: visit.id,
              },
            });
          } catch {}
        }

        return updated;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async updateStatus(id: string, dto: UpdateAmcStatusDto, userId?: string) {
    const contract = await this.findById(id);
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.aMCContract.update({
        where: { id: contract.id },
        data: { status: dto.status },
        include: {
          customer: true,
          product: true,
          visits: { include: { technician: true } },
        },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'AMC',
              action: 'STATUS_CHANGE',
              recordId: contract.id,
            },
          });
        } catch {}
      }

      return updated;
    });
  }

  async renew(id: string, dto: RenewAmcDto, userId?: string) {
    const oldContract = await this.findById(id);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start or end date format.');
    }
    if (end <= start) {
      throw new BadRequestException('Contract end date must be after start date.');
    }

    const totalVisits = Number(dto.totalVisits) || 4;
    const contractVal = dto.contractValue !== undefined ? Number(dto.contractValue) : oldContract.contractValue || 0;
    const gstRate = oldContract.gstRate || 18.0;
    const gstAmount = Number(((contractVal * gstRate) / 100).toFixed(2));
    const totalAmount = Number((contractVal + gstAmount).toFixed(2));

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        // 1. Mark old contract as Renewed
        await tx.aMCContract.update({
          where: { id: oldContract.id },
          data: {
            status: 'Renewed',
            renewalStatus: 'RENEWED',
          },
        });

        // 2. Generate new contract number
        const amcNumber = await this.generateAmcNumber(tx);

        // 3. Create fresh contract referencing previousContractId
        const newContract = await tx.aMCContract.create({
          data: {
            amcNumber,
            customerId: oldContract.customerId,
            productId: oldContract.productId,
            startDate: start,
            endDate: end,
            totalVisits,
            completedVisits: 0,
            remainingVisits: totalVisits,
            status: 'Active',
            contractType: oldContract.contractType || 'COMPREHENSIVE',
            contractValue: contractVal,
            gstRate,
            taxableAmount: contractVal,
            gstAmount,
            totalAmount,
            serviceFrequency: oldContract.serviceFrequency || 'QUARTERLY',
            billingFrequency: oldContract.billingFrequency || 'QUARTERLY',
            billingStatus: contractVal > 0 ? 'PENDING' : 'FULLY_BILLED',
            renewalStatus: 'NOT_RENEWED',
            previousContractId: oldContract.id,
            assignedTechnicianId: oldContract.assignedTechnicianId || null,
            terms: oldContract.terms || null,
            notes: dto.notes || `Renewed from ${oldContract.amcNumber}`,
          },
          include: {
            customer: true,
            product: true,
            visits: true,
          },
        });

        // Copy covered assets to new contract
        const oldAssets = await tx.aMCContractAsset.findMany({
          where: { amcContractId: oldContract.id },
        });
        for (const oa of oldAssets) {
          await tx.aMCContractAsset.create({
            data: {
              amcContractId: newContract.id,
              assetId: oa.assetId,
            },
          });
        }

        // Generate billing schedule for renewed contract
        if (contractVal > 0) {
          await this.createBillingSchedulesForContract(newContract, tx);
        }

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'AMC',
                action: 'RENEW',
                recordId: newContract.id,
              },
            });
          } catch {}
        }

        return await tx.aMCContract.findUnique({
          where: { id: newContract.id },
          include: {
            customer: true,
            product: true,
            assignedTechnician: true,
            coveredAssets: { include: { asset: true } },
            billingSchedules: true,
            visits: true,
          },
        });
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async generateBillingInvoice(dto: GenerateAmcBillingDto, userId?: string) {
    const contract = await this.prisma.aMCContract.findFirst({
      where: {
        OR: [{ id: dto.amcContractId }, { amcNumber: dto.amcContractId }],
      },
      include: {
        customer: true,
        product: true,
        billingSchedules: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`AMC Contract "${dto.amcContractId}" not found.`);
    }

    let schedule = null;
    if (dto.billingScheduleId) {
      schedule = contract.billingSchedules.find((s) => s.id === dto.billingScheduleId);
    } else if (dto.billingPeriodNumber) {
      schedule = contract.billingSchedules.find((s) => s.billingPeriodNumber === dto.billingPeriodNumber);
    } else {
      schedule = contract.billingSchedules.find((s) => s.status === 'PENDING');
    }

    if (!schedule) {
      // Fallback: If no schedule exists, create a default one or throw
      if (contract.billingSchedules.length === 0) {
        // Create an on-demand billing schedule
        schedule = await this.prisma.aMCBillingSchedule.create({
          data: {
            amcContractId: contract.id,
            billingPeriodNumber: 1,
            periodLabel: `Annual AMC (${new Date(contract.startDate).toISOString().split('T')[0]} to ${new Date(contract.endDate).toISOString().split('T')[0]})`,
            periodStart: contract.startDate,
            periodEnd: contract.endDate,
            dueDate: new Date(),
            taxableAmount: contract.contractValue || 6500,
            gstAmount: Number((((contract.contractValue || 6500) * 18) / 100).toFixed(2)),
            totalAmount: Number((((contract.contractValue || 6500) * 1.18)).toFixed(2)),
            status: 'PENDING',
          },
        });
      } else {
        throw new BadRequestException(`No pending billing schedules found for contract ${contract.amcNumber}.`);
      }
    }

    if (schedule.status === 'INVOICED' && schedule.invoiceId) {
      throw new ConflictException(
        `An invoice has already been generated for ${schedule.periodLabel} under contract ${contract.amcNumber}.`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(tx);
      const taxable = schedule.taxableAmount || contract.contractValue || 6500;
      const gstAmt = schedule.gstAmount || Number(((taxable * 18) / 100).toFixed(2));
      const grandTotal = schedule.totalAmount || Number((taxable + gstAmt).toFixed(2));

      // 1. Create GST Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: contract.customerId,
          invoiceDate: new Date(),
          subtotal: taxable,
          gstAmount: gstAmt,
          grandTotal,
          paymentStatus: 'Pending',
          createdById: effectiveUserId,
          items: {
            create: [
              {
                productId: contract.productId,
                description: `AMC Service Charges: ${contract.amcNumber} - ${schedule.periodLabel} (${contract.contractType || 'Comprehensive'})`,
                quantity: 1,
                sellingPrice: taxable,
                taxAmount: gstAmt,
                total: grandTotal,
              },
            ],
          },
        },
        include: {
          customer: true,
          items: true,
          payments: true,
        },
      });

      // 2. Update AMCBillingSchedule
      const updatedSchedule = await tx.aMCBillingSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'INVOICED',
          invoiceId: invoice.id,
        },
      });

      // 3. Update AMCContract billing status
      const remainingPending = await tx.aMCBillingSchedule.count({
        where: { amcContractId: contract.id, status: 'PENDING' },
      });
      await tx.aMCContract.update({
        where: { id: contract.id },
        data: {
          billingStatus: remainingPending === 0 ? 'FULLY_BILLED' : 'PARTIALLY_BILLED',
        },
      });

      // 4. AuditLog
      await tx.auditLog.create({
        data: {
          userId: effectiveUserId,
          moduleName: 'AMC',
          action: 'GENERATE_INVOICE',
          recordId: invoice.id,
        },
      });

      return {
        success: true,
        message: `GST Invoice ${invoice.invoiceNumber} generated for ${schedule.periodLabel}.`,
        invoice,
        billingSchedule: updatedSchedule,
        billingScheduleId: schedule.id,
      };
    });
  }

  async getBillingSchedules(contractId: string) {
    const contract = await this.findById(contractId);
    return await this.prisma.aMCBillingSchedule.findMany({
      where: { amcContractId: contract.id },
      include: {
        invoice: {
          include: { payments: true },
        },
      },
      orderBy: { billingPeriodNumber: 'asc' },
    });
  }

  async createInvoice(id: string, userId?: string) {
    return await this.generateBillingInvoice({ amcContractId: id }, userId);
  }

  async getStats() {
    const contracts = await this.prisma.aMCContract.findMany({
      include: { visits: true, billingSchedules: { include: { invoice: { include: { payments: true } } } } },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const total = contracts.length;
    const active = contracts.filter((c) => c.status === 'Active').length;
    const expiringSoon = contracts.filter((c) => {
      if (c.status === 'Expiring Soon') return true;
      const end = new Date(c.endDate);
      return c.status === 'Active' && end >= now && end <= thirtyDaysFromNow;
    }).length;
    const expired = contracts.filter(
      (c) => c.status === 'Expired' || (c.status === 'Active' && new Date(c.endDate) < now),
    ).length;

    let totalVisits = 0;
    let completedVisits = 0;
    let remainingVisits = 0;
    let totalContractValue = 0;
    let billedValue = 0;
    let collectedValue = 0;

    for (const c of contracts) {
      totalVisits += c.totalVisits || 0;
      completedVisits += c.completedVisits || 0;
      remainingVisits += c.remainingVisits || 0;
      totalContractValue += c.totalAmount || c.contractValue || 0;

      for (const bs of c.billingSchedules || []) {
        if (bs.status === 'INVOICED' && bs.invoice) {
          billedValue += bs.totalAmount || bs.invoice.grandTotal || 0;
          for (const p of bs.invoice.payments || []) {
            collectedValue += p.amount || 0;
          }
        }
      }
    }

    const pendingBilling = Math.max(0, totalContractValue - billedValue);
    const outstandingReceivables = Math.max(0, billedValue - collectedValue);

    return {
      total,
      active,
      expiringSoon,
      expired,
      totalVisits,
      completedVisits,
      remainingVisits,
      totalContractValue,
      billedValue,
      collectedValue,
      pendingBilling,
      outstandingReceivables,
    };
  }

  private async createBillingSchedulesForContract(contract: any, tx: any) {
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    const freq = contract.billingFrequency || 'QUARTERLY';
    const totalVal = contract.contractValue || 0;
    const gstRate = contract.gstRate || 18.0;

    let periods = 1;
    if (freq === 'MONTHLY') periods = 12;
    else if (freq === 'QUARTERLY') periods = 4;
    else if (freq === 'HALF_YEARLY') periods = 2;
    else periods = 1;

    const periodDuration = (end.getTime() - start.getTime()) / periods;
    const perPeriodTaxable = Number((totalVal / periods).toFixed(2));
    const perPeriodGst = Number(((perPeriodTaxable * gstRate) / 100).toFixed(2));
    const perPeriodTotal = Number((perPeriodTaxable + perPeriodGst).toFixed(2));

    for (let i = 1; i <= periods; i++) {
      const pStart = new Date(start.getTime() + (i - 1) * periodDuration);
      const pEnd = new Date(start.getTime() + i * periodDuration);
      const dueDate = new Date(pStart);

      let label = `Period ${i}`;
      if (freq === 'QUARTERLY') label = `Q${i} (${pStart.toLocaleString('default', { month: 'short' })} - ${pEnd.toLocaleString('default', { month: 'short' })} ${pEnd.getFullYear()})`;
      else if (freq === 'MONTHLY') label = `Month ${i} (${pStart.toLocaleString('default', { month: 'short' })} ${pStart.getFullYear()})`;
      else if (freq === 'HALF_YEARLY') label = `H${i} (${pStart.toLocaleString('default', { month: 'short' })} - ${pEnd.toLocaleString('default', { month: 'short' })} ${pEnd.getFullYear()})`;
      else label = `Annual AMC (${pStart.getFullYear()} - ${pEnd.getFullYear()})`;

      await tx.aMCBillingSchedule.create({
        data: {
          amcContractId: contract.id,
          billingPeriodNumber: i,
          periodLabel: label,
          periodStart: pStart,
          periodEnd: pEnd,
          dueDate,
          taxableAmount: perPeriodTaxable,
          gstAmount: perPeriodGst,
          totalAmount: perPeriodTotal,
          status: 'PENDING',
        },
      });
    }
  }

  private async generateAmcNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const last = await tx.aMCContract.findFirst({
      where: { amcNumber: { startsWith: `AMC-${year}-` } },
      orderBy: { amcNumber: 'desc' },
      select: { amcNumber: true },
    });
    if (!last) return `AMC-${year}-0001`;
    const parts = last.amcNumber.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `AMC-${year}-${String(seq).padStart(4, '0')}`;
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

  async remove(id: string, userId?: string) {
    const contract = await this.findById(id);
    const effectiveUserId = await this.resolveUserId(userId);

    const cancelled = await this.prisma.aMCContract.update({
      where: { id: contract.id },
      data: { status: 'Cancelled' },
    });

    if (effectiveUserId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: effectiveUserId,
            moduleName: 'AMC',
            action: 'CANCEL',
            recordId: contract.id,
          },
        });
      } catch {}
    }

    return { success: true, message: `AMC Contract ${contract.amcNumber} cancelled successfully.` };
  }
}
