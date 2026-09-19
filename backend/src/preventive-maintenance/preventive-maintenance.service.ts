import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePmDto } from './dto/create-pm.dto';
import { UpdatePmDto } from './dto/update-pm.dto';
import { CompletePmDto } from './dto/complete-pm.dto';
import { PmQueryDto } from './dto/pm-query.dto';

@Injectable()
export class PreventiveMaintenanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: PmQueryDto) {
    const search = query?.search?.trim();
    const assetId = query?.assetId?.trim();
    const customerId = query?.customerId?.trim();
    const amcContractId = query?.amcContractId?.trim();
    const technicianId = query?.technicianId?.trim();
    const status = query?.status?.trim();
    const frequency = query?.frequency?.trim();
    const range = query?.range?.trim();
    const from = query?.from?.trim();
    const to = query?.to?.trim();

    const whereClause: any = {};

    if (assetId) whereClause.assetId = assetId;
    if (customerId) whereClause.customerId = customerId;
    if (amcContractId) whereClause.amcContractId = amcContractId;
    if (technicianId) whereClause.technicianId = technicianId;
    if (frequency) whereClause.frequency = frequency;

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === 'today') {
      whereClause.plannedDate = { gte: startOfToday, lte: endOfToday };
    } else if (range === 'this_week') {
      const day = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      whereClause.plannedDate = { gte: startOfWeek, lte: endOfWeek };
    } else if (range === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      whereClause.plannedDate = { gte: startOfMonth, lte: endOfMonth };
    } else if (range === 'overdue') {
      whereClause.plannedDate = { lt: startOfToday };
      whereClause.status = { in: ['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'] };
    } else if (range === 'upcoming') {
      whereClause.plannedDate = { gte: startOfToday };
      whereClause.status = { in: ['SCHEDULED', 'ASSIGNED'] };
    } else if (from && to) {
      const startDate = new Date(from);
      const endDate = new Date(to);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        endDate.setHours(23, 59, 59, 999);
        whereClause.plannedDate = { gte: startDate, lte: endDate };
      }
    }

    if (search) {
      whereClause.OR = [
        { pmNumber: { contains: search, mode: 'insensitive' } },
        { asset: { assetNumber: { contains: search, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: search, mode: 'insensitive' } } },
        { customer: { customerName: { contains: search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { customerCode: { contains: search, mode: 'insensitive' } } },
        { amcContract: { amcNumber: { contains: search, mode: 'insensitive' } } },
        { technician: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const page = Math.max(1, parseInt(query?.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit || '50', 10) || 50));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.preventiveMaintenanceSchedule.count({ where: whereClause }),
      this.prisma.preventiveMaintenanceSchedule.findMany({
        where: whereClause,
        include: {
          asset: {
            include: { product: true },
          },
          customer: true,
          amcContract: true,
          technician: true,
          jobCard: true,
          partsConsumed: {
            include: { product: true },
          },
        },
        orderBy: { plannedDate: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const schedule = await this.prisma.preventiveMaintenanceSchedule.findFirst({
      where: {
        OR: [{ id }, { pmNumber: id }],
      },
      include: {
        asset: {
          include: {
            product: { include: { brand: true, category: true } },
            customer: true,
          },
        },
        customer: true,
        amcContract: {
          include: { assignedTechnician: true },
        },
        technician: true,
        jobCard: true,
        partsConsumed: {
          include: { product: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`PM schedule "${id}" was not found.`);
    }

    return schedule;
  }

  async create(dto: CreatePmDto, userId?: string) {
    // 1. Verify Asset
    const asset = await this.prisma.asset.findFirst({
      where: {
        OR: [{ id: dto.assetId }, { assetNumber: dto.assetId }],
        deletedAt: null,
      },
      include: { customer: true },
    });
    if (!asset) {
      throw new NotFoundException(`Asset "${dto.assetId}" was not found.`);
    }

    const customerId = dto.customerId || asset.customerId;

    // 2. If AMC Contract provided, verify
    if (dto.amcContractId) {
      const amc = await this.prisma.aMCContract.findFirst({
        where: {
          OR: [{ id: dto.amcContractId }, { amcNumber: dto.amcContractId }],
        },
      });
      if (!amc) {
        throw new NotFoundException(`AMC Contract "${dto.amcContractId}" was not found.`);
      }
    }

    // 3. If Technician provided, verify active
    if (dto.technicianId) {
      const tech = await this.prisma.employee.findFirst({
        where: { id: dto.technicianId, status: 'ACTIVE', deletedAt: null },
      });
      if (!tech) {
        throw new BadRequestException(`Assigned technician "${dto.technicianId}" is not active or does not exist.`);
      }
    }

    const plannedDate = new Date(dto.plannedDate);
    if (isNaN(plannedDate.getTime())) {
      throw new BadRequestException('Invalid plannedDate format.');
    }

    // Check duplicate schedule on the same day for same asset
    const startOfDay = new Date(plannedDate.getFullYear(), plannedDate.getMonth(), plannedDate.getDate());
    const endOfDay = new Date(plannedDate.getFullYear(), plannedDate.getMonth(), plannedDate.getDate(), 23, 59, 59, 999);

    const duplicate = await this.prisma.preventiveMaintenanceSchedule.findFirst({
      where: {
        assetId: asset.id,
        plannedDate: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
    });
    if (duplicate) {
      throw new ConflictException(
        `A preventive maintenance visit is already scheduled for asset ${asset.assetNumber} on ${plannedDate.toISOString().split('T')[0]} (${duplicate.pmNumber}).`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const pmNumber = await this.generatePmNumber(tx);

      const pm = await tx.preventiveMaintenanceSchedule.create({
        data: {
          pmNumber,
          assetId: asset.id,
          customerId,
          amcContractId: dto.amcContractId || null,
          frequency: dto.frequency || 'QUARTERLY',
          plannedDate,
          technicianId: dto.technicianId || null,
          checklist: dto.checklist || JSON.stringify([
            'Compressor Operating Amps Check',
            'Air Filter Wash & Clean',
            'Condenser & Evaporator Coil Clean',
            'Gas Pressure (PSI) Test',
            'Electrical Wiring & Terminal Tightening',
            'Drain Line Flush & Leak Test',
          ]),
          status: dto.status || (dto.technicianId ? 'ASSIGNED' : 'SCHEDULED'),
          remarks: dto.remarks || null,
        },
        include: {
          asset: true,
          customer: true,
          technician: true,
        },
      });

      try {
        await tx.auditLog.create({
          data: {
            userId: userId || 'usr-admin-01',
            moduleName: 'PREVENTIVE_MAINTENANCE',
            action: 'CREATE',
            recordId: pm.id,
          },
        });
      } catch (e) {}

      return pm;
    });
  }

  async generateAmcPMVisits(amcContractId: string, userId?: string) {
    const amc = await this.prisma.aMCContract.findFirst({
      where: {
        OR: [{ id: amcContractId }, { amcNumber: amcContractId }],
      },
      include: {
        coveredAssets: { include: { asset: true } },
        customer: true,
      },
    });

    if (!amc) {
      throw new NotFoundException(`AMC Contract "${amcContractId}" was not found.`);
    }

    // Identify assets covered
    let targetAssets: any[] = [];
    if (amc.coveredAssets && amc.coveredAssets.length > 0) {
      targetAssets = amc.coveredAssets.map((ca) => ca.asset).filter(Boolean);
    } else {
      // Find asset by customer and product
      const productAsset = await this.prisma.asset.findFirst({
        where: {
          customerId: amc.customerId,
          productId: amc.productId,
          deletedAt: null,
        },
      });
      if (productAsset) {
        targetAssets = [productAsset];
      }
    }

    if (targetAssets.length === 0) {
      throw new BadRequestException(
        `No installed assets found matching AMC contract ${amc.amcNumber}. Please register an asset for this customer and product first.`,
      );
    }

    const totalVisits = amc.totalVisits || 4;
    const start = new Date(amc.startDate).getTime();
    const end = new Date(amc.endDate).getTime();
    const duration = end - start;
    const interval = duration / totalVisits;

    const createdList: any[] = [];
    const year = new Date().getFullYear();
    const prefix = `PM-${year}-`;
    const lastPm = await this.prisma.preventiveMaintenanceSchedule.findFirst({
      where: { pmNumber: { startsWith: prefix } },
      orderBy: { pmNumber: 'desc' },
      select: { pmNumber: true },
    });
    let curSeq = 0;
    if (lastPm) {
      const parts = lastPm.pmNumber.split('-');
      curSeq = parseInt(parts[2] || '0', 10);
    }

    for (const asset of targetAssets) {
      for (let i = 1; i <= totalVisits; i++) {
        const plannedTime = start + (i - 0.5) * interval;
        const plannedDate = new Date(plannedTime);

        const startOfDay = new Date(plannedDate.getFullYear(), plannedDate.getMonth(), plannedDate.getDate());
        const endOfDay = new Date(plannedDate.getFullYear(), plannedDate.getMonth(), plannedDate.getDate(), 23, 59, 59, 999);

        const existing = await this.prisma.preventiveMaintenanceSchedule.findFirst({
          where: {
            assetId: asset.id,
            amcContractId: amc.id,
            plannedDate: { gte: startOfDay, lte: endOfDay },
          },
        });

        if (!existing) {
          curSeq++;
          const pmNumber = `PM-${year}-${String(curSeq).padStart(4, '0')}`;
          const pm = await this.prisma.preventiveMaintenanceSchedule.create({
            data: {
              pmNumber,
              assetId: asset.id,
              customerId: amc.customerId,
              amcContractId: amc.id,
              frequency: amc.serviceFrequency || 'QUARTERLY',
              plannedDate,
              technicianId: amc.assignedTechnicianId || null,
              checklist: JSON.stringify([
                'Compressor Operating Amps Check',
                'Air Filter Wash & Clean',
                'Condenser & Evaporator Coil Clean',
                'Gas Pressure (PSI) Test',
                'Electrical Wiring & Terminal Tightening',
                'Drain Line Flush & Leak Test',
              ]),
              status: amc.assignedTechnicianId ? 'ASSIGNED' : 'SCHEDULED',
              remarks: `Automated AMC Visit #${i} of ${totalVisits}`,
            },
          });
          createdList.push(pm);
        }
      }

      // Update asset amcStatus to COVERED
      await this.prisma.asset.update({
        where: { id: asset.id },
        data: { amcStatus: 'COVERED' },
      });
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: userId || 'usr-admin-01',
          moduleName: 'AMC',
          action: 'GENERATE_PM',
          recordId: amc.id,
        },
      });
    } catch (e) {}

    return {
      success: true,
      message: `Generated ${createdList.length} preventive maintenance visit schedules.`,
      generatedVisits: createdList,
    };
  }

  async update(id: string, dto: UpdatePmDto, userId?: string) {
    const pm = await this.prisma.preventiveMaintenanceSchedule.findFirst({
      where: { OR: [{ id }, { pmNumber: id }] },
    });
    if (!pm) {
      throw new NotFoundException(`PM schedule "${id}" was not found.`);
    }

    if (dto.technicianId) {
      const tech = await this.prisma.employee.findFirst({
        where: { id: dto.technicianId, status: 'ACTIVE', deletedAt: null },
      });
      if (!tech) {
        throw new BadRequestException(`Assigned technician "${dto.technicianId}" is not active or does not exist.`);
      }
    }

    const updated = await this.prisma.preventiveMaintenanceSchedule.update({
      where: { id: pm.id },
      data: {
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        technicianId: dto.technicianId !== undefined ? dto.technicianId : undefined,
        status: dto.status || (dto.technicianId && pm.status === 'SCHEDULED' ? 'ASSIGNED' : undefined),
        checklist: dto.checklist !== undefined ? dto.checklist : undefined,
        observations: dto.observations !== undefined ? dto.observations : undefined,
        workPerformed: dto.workPerformed !== undefined ? dto.workPerformed : undefined,
        recommendations: dto.recommendations !== undefined ? dto.recommendations : undefined,
        customerAcknowledgement: dto.customerAcknowledgement !== undefined ? dto.customerAcknowledgement : undefined,
        technicianRemarks: dto.technicianRemarks !== undefined ? dto.technicianRemarks : undefined,
        remarks: dto.remarks !== undefined ? dto.remarks : undefined,
      },
      include: {
        asset: true,
        customer: true,
        technician: true,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: userId || 'usr-admin-01',
          moduleName: 'PREVENTIVE_MAINTENANCE',
          action: 'UPDATE',
          recordId: updated.id,
        },
      });
    } catch (e) {}

    return updated;
  }

  async completeVisit(id: string, dto: CompletePmDto, userId?: string) {
    const pm = await this.prisma.preventiveMaintenanceSchedule.findFirst({
      where: { OR: [{ id }, { pmNumber: id }] },
      include: {
        asset: true,
        amcContract: true,
      },
    });

    if (!pm) {
      throw new NotFoundException(`PM schedule "${id}" was not found.`);
    }

    if (pm.status === 'COMPLETED') {
      throw new BadRequestException(`PM schedule ${pm.pmNumber} is already completed.`);
    }

    const completionDate = dto.completionDate ? new Date(dto.completionDate) : new Date();

    return await this.prisma.$transaction(async (tx) => {
      let totalPartsCost = 0;

      // Validate & deduct spare parts if provided
      if (dto.partsConsumed && dto.partsConsumed.length > 0) {
        for (const part of dto.partsConsumed) {
          const product = await tx.product.findUnique({
            where: { id: part.productId },
            include: { inventory: true },
          });

          if (!product) {
            throw new NotFoundException(`Product / Spare Part "${part.productId}" not found.`);
          }

          const currentStock = product.inventory?.[0]?.availableStock ?? product.stockQuantity;
          if (currentStock < part.quantity) {
            throw new BadRequestException(
              `Insufficient inventory for "${product.productName}" (SKU: ${product.sku}). Available: ${currentStock}, Requested: ${part.quantity}. Transaction rolled back.`,
            );
          }

          const unitCost = part.unitCost !== undefined ? part.unitCost : product.purchasePrice || 0;
          const lineTotal = unitCost * part.quantity;
          totalPartsCost += lineTotal;

          // 1. Record stock movement
          const sm = await tx.stockMovement.create({
            data: {
              productId: product.id,
              movementType: 'OUT',
              referenceType: 'Service',
              referenceId: pm.id,
              quantity: part.quantity,
              previousQuantity: currentStock,
              resultingQuantity: currentStock - part.quantity,
              unitCost,
              remarks: `Consumed during PM visit ${pm.pmNumber} for asset ${pm.asset.assetNumber}`,
              createdById: userId || null,
            },
          });

          // 2. Update Warehouse inventory
          if (product.inventory?.[0]) {
            await tx.inventory.update({
              where: { id: product.inventory[0].id },
              data: { availableStock: { decrement: part.quantity } },
            });
          }

          // 3. Update Product aggregate stock
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: { decrement: part.quantity } },
          });

          // 4. Create AssetPartConsumption record
          await tx.assetPartConsumption.create({
            data: {
              assetId: pm.assetId,
              pmScheduleId: pm.id,
              productId: product.id,
              quantity: part.quantity,
              unitCost,
              totalCost: lineTotal,
              stockMovementId: sm.id,
              consumedAt: completionDate,
            },
          });
        }
      }

      let parsedStart: Date | undefined = undefined;
      if (dto.actualStartTime) {
        const d = new Date(dto.actualStartTime);
        parsedStart = isNaN(d.getTime()) ? new Date() : d;
      }
      let parsedEnd: Date | undefined = undefined;
      if (dto.actualEndTime) {
        const d = new Date(dto.actualEndTime);
        parsedEnd = isNaN(d.getTime()) ? new Date() : d;
      }

      // Update PM record
      const completedPm = await tx.preventiveMaintenanceSchedule.update({
        where: { id: pm.id },
        data: {
          status: 'COMPLETED',
          completionDate,
          actualStartTime: parsedStart,
          actualEndTime: parsedEnd,
          checklist: dto.checklist || undefined,
          observations: dto.observations || undefined,
          workPerformed: dto.workPerformed,
          recommendations: dto.recommendations || undefined,
          customerAcknowledgement: dto.customerAcknowledgement || undefined,
          technicianRemarks: dto.technicianRemarks || undefined,
        },
        include: {
          asset: true,
          customer: true,
          technician: true,
          partsConsumed: { include: { product: true } },
        },
      });

      // Update Asset lastServiceDate & nextServiceDate
      const nextDate = new Date(completionDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days ahead
      await tx.asset.update({
        where: { id: pm.assetId },
        data: {
          lastServiceDate: completionDate,
          nextServiceDate: nextDate,
          status: 'ACTIVE',
        },
      });

      // Create AssetServiceHistory entry
      await tx.assetServiceHistory.create({
        data: {
          assetId: pm.assetId,
          serviceType: 'PREVENTIVE',
          technicianId: pm.technicianId || null,
          serviceDate: completionDate,
          complaint: `PM Routine Maintenance (${pm.frequency})`,
          diagnosis: dto.observations || 'Routine operational maintenance completed.',
          resolution: dto.workPerformed,
          cost: totalPartsCost,
          notes: `Completed via PM record ${pm.pmNumber}. Recommendations: ${dto.recommendations || 'None'}`,
        },
      });

      // If linked to AMCContract, increment completed visits
      if (pm.amcContractId) {
        const contract = await tx.aMCContract.findUnique({ where: { id: pm.amcContractId } });
        if (contract) {
          const newCompleted = (contract.completedVisits || 0) + 1;
          const newRemaining = Math.max(0, (contract.totalVisits || 4) - newCompleted);
          await tx.aMCContract.update({
            where: { id: contract.id },
            data: {
              completedVisits: newCompleted,
              remainingVisits: newRemaining,
            },
          });
        }
      }

      try {
        await tx.auditLog.create({
          data: {
            userId: userId || 'usr-admin-01',
            moduleName: 'PREVENTIVE_MAINTENANCE',
            action: 'COMPLETE_PM',
            recordId: completedPm.id,
          },
        });
      } catch (e) {}

      return completedPm;
    }, { timeout: 30000, maxWait: 10000 });
  }

  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todaysVisits,
      upcomingVisits,
      overdueVisits,
      completedThisMonth,
      missedVisits,
      totalCount,
    ] = await Promise.all([
      this.prisma.preventiveMaintenanceSchedule.count({
        where: {
          plannedDate: { gte: startOfToday, lte: endOfToday },
          status: { in: ['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.preventiveMaintenanceSchedule.count({
        where: {
          plannedDate: { gt: endOfToday, lte: in7Days },
          status: { in: ['SCHEDULED', 'ASSIGNED'] },
        },
      }),
      this.prisma.preventiveMaintenanceSchedule.count({
        where: {
          plannedDate: { lt: startOfToday },
          status: { in: ['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.preventiveMaintenanceSchedule.count({
        where: {
          status: 'COMPLETED',
          completionDate: { gte: startOfMonth },
        },
      }),
      this.prisma.preventiveMaintenanceSchedule.count({
        where: {
          status: 'MISSED',
        },
      }),
      this.prisma.preventiveMaintenanceSchedule.count(),
    ]);

    return {
      todaysVisits,
      upcomingVisits,
      overdueVisits,
      completedThisMonth,
      missedVisits,
      totalCount,
    };
  }

  private async generatePmNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PM-${year}-`;
    const last = await tx.preventiveMaintenanceSchedule.findFirst({
      where: { pmNumber: { startsWith: prefix } },
      orderBy: { pmNumber: 'desc' },
      select: { pmNumber: true },
    });

    if (!last) return `PM-${year}-0001`;
    const parts = last.pmNumber.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `PM-${year}-${String(seq).padStart(4, '0')}`;
  }
}
