import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: AssetQueryDto) {
    const search = query?.search?.trim();
    const customerId = query?.customerId?.trim();
    const productId = query?.productId?.trim();
    const status = query?.status?.trim();
    const amcStatus = query?.amcStatus?.trim();
    const warrantyStatus = query?.warrantyStatus?.trim();
    const technicianId = query?.technicianId?.trim();
    const location = query?.location?.trim();

    const whereClause: any = {
      deletedAt: null,
    };

    if (customerId) whereClause.customerId = customerId;
    if (productId) whereClause.productId = productId;
    if (technicianId) whereClause.technicianId = technicianId;
    if (location) {
      whereClause.location = { contains: location, mode: 'insensitive' };
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (amcStatus && amcStatus !== 'ALL') {
      whereClause.amcStatus = amcStatus;
    }

    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    if (warrantyStatus === 'ACTIVE') {
      whereClause.warrantyEndDate = { gte: now };
    } else if (warrantyStatus === 'EXPIRING_30') {
      whereClause.warrantyEndDate = { gte: now, lte: in30Days };
    } else if (warrantyStatus === 'EXPIRING_60') {
      whereClause.warrantyEndDate = { gte: now, lte: in60Days };
    } else if (warrantyStatus === 'EXPIRED') {
      whereClause.warrantyEndDate = { lt: now };
    } else if (warrantyStatus === 'NONE') {
      whereClause.warrantyEndDate = null;
    }

    if (search) {
      whereClause.OR = [
        { assetNumber: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { modelNumber: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { customer: { customerName: { contains: search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { customerCode: { contains: search, mode: 'insensitive' } } },
        { product: { productName: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const page = Math.max(1, parseInt(query?.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit || '50', 10) || 50));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.asset.count({ where: whereClause }),
      this.prisma.asset.findMany({
        where: whereClause,
        include: {
          customer: true,
          product: {
            include: { brand: true, category: true },
          },
          technician: true,
          installation: true,
          pmSchedules: {
            take: 3,
            orderBy: { plannedDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: items.map((a) => this.enrichAsset(a)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        OR: [{ id }, { assetNumber: id }],
        deletedAt: null,
      },
      include: {
        customer: true,
        product: {
          include: { brand: true, category: true },
        },
        installation: true,
        technician: true,
        serviceHistories: {
          include: {
            jobCard: true,
            technician: true,
          },
          orderBy: { serviceDate: 'desc' },
        },
        pmSchedules: {
          include: {
            technician: true,
            jobCard: true,
            partsConsumed: {
              include: { product: true },
            },
          },
          orderBy: { plannedDate: 'asc' },
        },
        amcContractAssets: {
          include: {
            amcContract: {
              include: { customer: true, assignedTechnician: true },
            },
          },
        },
        partsConsumed: {
          include: {
            product: true,
            pmSchedule: true,
            jobCard: true,
          },
          orderBy: { consumedAt: 'desc' },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID or Number "${id}" was not found.`);
    }

    return this.enrichAsset(asset);
  }

  async create(dto: CreateAssetDto, userId?: string) {
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
      include: { brand: true },
    });
    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found.`);
    }

    // 3. Check Technician if assigned
    if (dto.technicianId) {
      const tech = await this.prisma.employee.findFirst({
        where: { id: dto.technicianId, status: 'ACTIVE', deletedAt: null },
      });
      if (!tech) {
        throw new BadRequestException(`Assigned technician "${dto.technicianId}" is not active or does not exist.`);
      }
    }

    // 4. Check Serial Number uniqueness if provided
    if (dto.serialNumber?.trim()) {
      const existing = await this.prisma.asset.findFirst({
        where: {
          serialNumber: dto.serialNumber.trim(),
          deletedAt: null,
        },
      });
      if (existing) {
        throw new BadRequestException(`An asset with serial number "${dto.serialNumber.trim()}" already exists (${existing.assetNumber}).`);
      }
    }

    // 5. Transaction: Generate assetNumber AST-YYYY-XXXX and create
    return await this.prisma.$transaction(async (tx) => {
      const assetNumber = await this.generateAssetNumber(tx);

      // Auto-compute warranty if dates not provided
      let wStart = dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : dto.installationDate ? new Date(dto.installationDate) : new Date();
      let wEnd = dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null;
      if (!wEnd && product.warrantyMonths) {
        wEnd = new Date(wStart.getTime() + product.warrantyMonths * 30 * 24 * 60 * 60 * 1000);
      }

      const asset = await tx.asset.create({
        data: {
          assetNumber,
          customerId: customer.id,
          productId: product.id,
          installationId: dto.installationId || null,
          brandName: dto.brandName || product.brand?.brandName || 'Generic',
          modelNumber: dto.modelNumber || product.model || product.sku,
          serialNumber: dto.serialNumber?.trim() || null,
          capacitySpec: dto.capacitySpec || null,
          installationDate: dto.installationDate ? new Date(dto.installationDate) : new Date(),
          warrantyStartDate: wStart,
          warrantyEndDate: wEnd,
          location: dto.location || null,
          siteAddress: dto.siteAddress || customer.address,
          floorArea: dto.floorArea || null,
          status: dto.status || 'ACTIVE',
          amcStatus: dto.amcStatus || 'NONE',
          technicianId: dto.technicianId || null,
          notes: dto.notes || null,
        },
        include: {
          customer: true,
          product: true,
          technician: true,
        },
      });

      // Create initial service history log for installation
      if (dto.installationDate || asset.installationDate) {
        await tx.assetServiceHistory.create({
          data: {
            assetId: asset.id,
            serviceType: 'INSTALLATION',
            technicianId: dto.technicianId || null,
            serviceDate: asset.installationDate || new Date(),
            complaint: 'Initial Equipment Commissioning',
            resolution: 'Installed, tested, and handed over to customer.',
            notes: `Initial commissioning at ${dto.location || customer.city}.`,
          },
        });
      }

      // Record AuditLog
      try {
        await tx.auditLog.create({
          data: {
            userId: userId || 'usr-admin-01',
            moduleName: 'ASSET',
            action: 'CREATE',
            recordId: asset.id,
          },
        });
      } catch (e) {}

      return this.enrichAsset(asset);
    });
  }

  async update(id: string, dto: UpdateAssetDto, userId?: string) {
    const existing = await this.prisma.asset.findFirst({
      where: { OR: [{ id }, { assetNumber: id }], deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Asset "${id}" was not found.`);
    }

    if (dto.serialNumber?.trim() && dto.serialNumber.trim() !== existing.serialNumber) {
      const duplicate = await this.prisma.asset.findFirst({
        where: {
          serialNumber: dto.serialNumber.trim(),
          id: { not: existing.id },
          deletedAt: null,
        },
      });
      if (duplicate) {
        throw new BadRequestException(`Serial number "${dto.serialNumber.trim()}" is already assigned to asset ${duplicate.assetNumber}.`);
      }
    }

    if (dto.technicianId) {
      const tech = await this.prisma.employee.findFirst({
        where: { id: dto.technicianId, status: 'ACTIVE', deletedAt: null },
      });
      if (!tech) {
        throw new BadRequestException(`Assigned technician "${dto.technicianId}" is not active or does not exist.`);
      }
    }

    const updated = await this.prisma.asset.update({
      where: { id: existing.id },
      data: {
        customerId: dto.customerId || undefined,
        productId: dto.productId || undefined,
        installationId: dto.installationId !== undefined ? dto.installationId : undefined,
        brandName: dto.brandName !== undefined ? dto.brandName : undefined,
        modelNumber: dto.modelNumber !== undefined ? dto.modelNumber : undefined,
        serialNumber: dto.serialNumber !== undefined ? dto.serialNumber?.trim() : undefined,
        capacitySpec: dto.capacitySpec !== undefined ? dto.capacitySpec : undefined,
        installationDate: dto.installationDate ? new Date(dto.installationDate) : undefined,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        location: dto.location !== undefined ? dto.location : undefined,
        siteAddress: dto.siteAddress !== undefined ? dto.siteAddress : undefined,
        floorArea: dto.floorArea !== undefined ? dto.floorArea : undefined,
        status: dto.status || undefined,
        amcStatus: dto.amcStatus || undefined,
        lastServiceDate: dto.lastServiceDate ? new Date(dto.lastServiceDate) : undefined,
        nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : undefined,
        technicianId: dto.technicianId !== undefined ? dto.technicianId : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
      include: {
        customer: true,
        product: true,
        technician: true,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: userId || 'usr-admin-01',
          moduleName: 'ASSET',
          action: 'UPDATE',
          recordId: updated.id,
        },
      });
    } catch (e) {}

    return this.enrichAsset(updated);
  }

  async delete(id: string, userId?: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { OR: [{ id }, { assetNumber: id }], deletedAt: null },
    });
    if (!asset) {
      throw new NotFoundException(`Asset "${id}" was not found.`);
    }

    const retired = await this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        status: 'SCRAPPED',
        deletedAt: new Date(),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: userId || 'usr-admin-01',
          moduleName: 'ASSET',
          action: 'DELETE',
          recordId: asset.id,
        },
      });
    } catch (e) {}

    return { success: true, message: `Asset ${asset.assetNumber} retired successfully.` };
  }

  async getWarrantyAnalysis() {
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const [active, expiring30, expiring60, expired, noWarranty] = await Promise.all([
      this.prisma.asset.findMany({
        where: { warrantyEndDate: { gte: now }, deletedAt: null },
        include: { customer: true, product: true },
      }),
      this.prisma.asset.findMany({
        where: { warrantyEndDate: { gte: now, lte: in30Days }, deletedAt: null },
        include: { customer: true, product: true },
      }),
      this.prisma.asset.findMany({
        where: { warrantyEndDate: { gte: now, lte: in60Days }, deletedAt: null },
        include: { customer: true, product: true },
      }),
      this.prisma.asset.findMany({
        where: { warrantyEndDate: { lt: now }, deletedAt: null },
        include: { customer: true, product: true },
      }),
      this.prisma.asset.findMany({
        where: { warrantyEndDate: null, deletedAt: null },
        include: { customer: true, product: true },
      }),
    ]);

    return {
      activeCount: active.length,
      expiring30Count: expiring30.length,
      expiring60Count: expiring60.length,
      expiredCount: expired.length,
      noWarrantyCount: noWarranty.length,
      activeWarranty: active.map((a) => this.enrichAsset(a)),
      expiring30List: expiring30.map((a) => this.enrichAsset(a)),
      expiring60List: expiring60.map((a) => this.enrichAsset(a)),
      expiredList: expired.map((a) => this.enrichAsset(a)),
    };
  }

  computeWarrantyStatus(warrantyEndDate?: Date | null): string {
    if (!warrantyEndDate) return 'NONE';
    const now = new Date();
    const end = new Date(warrantyEndDate);
    if (end < now) return 'EXPIRED';
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return 'EXPIRING_30';
    if (diffDays <= 60) return 'EXPIRING_60';
    return 'ACTIVE';
  }

  enrichAsset(asset: any) {
    if (!asset) return asset;
    return {
      ...asset,
      warrantyStatus: this.computeWarrantyStatus(asset.warrantyEndDate),
    };
  }

  async getStats() {
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalAssets,
      activeAssets,
      underService,
      breakdownCount,
      warrantyExpiring,
      amcCovered,
      amcExpiring,
      pmDueCount,
      breakdownsThisMonth,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { deletedAt: null } }),
      this.prisma.asset.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.asset.count({ where: { status: 'UNDER_SERVICE', deletedAt: null } }),
      this.prisma.asset.count({ where: { status: 'BREAKDOWN', deletedAt: null } }),
      this.prisma.asset.count({
        where: {
          warrantyEndDate: { gte: now, lte: in30Days },
          deletedAt: null,
        },
      }),
      this.prisma.asset.count({ where: { amcStatus: 'COVERED', deletedAt: null } }),
      this.prisma.asset.count({ where: { amcStatus: 'EXPIRING_SOON', deletedAt: null } }),
      this.prisma.preventiveMaintenanceSchedule.count({
        where: {
          status: { in: ['SCHEDULED', 'ASSIGNED'] },
          plannedDate: { lte: in30Days },
        },
      }),
      this.prisma.assetServiceHistory.count({
        where: {
          serviceType: 'BREAKDOWN',
          serviceDate: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      totalAssets,
      activeAssets,
      underService,
      breakdownCount,
      warrantyExpiring,
      amcCovered,
      amcExpiring,
      pmDueCount,
      breakdownsThisMonth,
    };
  }

  private async generateAssetNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `AST-${year}-`;
    const last = await tx.asset.findFirst({
      where: { assetNumber: { startsWith: prefix } },
      orderBy: { assetNumber: 'desc' },
      select: { assetNumber: true },
    });

    if (!last) return `AST-${year}-0001`;
    const parts = last.assetNumber.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `AST-${year}-${String(seq).padStart(4, '0')}`;
  }
}
