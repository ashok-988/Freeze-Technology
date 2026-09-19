import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SupplierQueryDto) {
    const { search } = query;

    const where: any = {
      deletedAt: null,
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { supplierCode: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { contactPerson: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { gstNumber: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.supplier.findMany({
      where,
      include: {
        purchaseOrders: {
          select: {
            id: true,
            poNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        OR: [{ id }, { supplierCode: id }],
        deletedAt: null,
      },
      include: {
        purchaseOrders: {
          include: {
            items: {
              include: { product: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier "${id}" not found.`);
    }

    return supplier;
  }

  async getStats() {
    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null },
      include: {
        purchaseOrders: true,
      },
    });

    const totalSuppliers = suppliers.length;
    let totalPOs = 0;
    let totalSpend = 0;

    for (const s of suppliers) {
      totalPOs += s.purchaseOrders.length;
      for (const po of s.purchaseOrders) {
        if (po.status !== 'Cancelled') {
          totalSpend += po.totalAmount || 0;
        }
      }
    }

    return {
      totalSuppliers,
      totalPOs,
      totalSpend: Number(totalSpend.toFixed(2)),
    };
  }

  async create(dto: CreateSupplierDto, userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const supplierCode = await this.generateSupplierCode(tx);

        const supplier = await tx.supplier.create({
          data: {
            supplierCode,
            companyName: dto.companyName.trim(),
            contactPerson: dto.contactPerson.trim(),
            phone: dto.phone.trim(),
            email: dto.email?.trim() || null,
            gstNumber: dto.gstNumber?.trim() || null,
            address: dto.address.trim(),
            city: dto.city?.trim() || 'Chennai',
            state: dto.state?.trim() || 'Tamil Nadu',
            pincode: dto.pincode?.trim() || null,
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Suppliers',
                action: 'CREATE',
                recordId: supplier.id,
              },
            });
          } catch {}
        }

        return supplier;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async update(id: string, dto: UpdateSupplierDto, userId?: string) {
    const supplier = await this.findById(id);
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.supplier.update({
          where: { id: supplier.id },
          data: {
            companyName: dto.companyName !== undefined ? dto.companyName.trim() : supplier.companyName,
            contactPerson: dto.contactPerson !== undefined ? dto.contactPerson.trim() : supplier.contactPerson,
            phone: dto.phone !== undefined ? dto.phone.trim() : supplier.phone,
            email: dto.email !== undefined ? dto.email?.trim() || null : supplier.email,
            gstNumber: dto.gstNumber !== undefined ? dto.gstNumber?.trim() || null : supplier.gstNumber,
            address: dto.address !== undefined ? dto.address.trim() : supplier.address,
            city: dto.city !== undefined ? dto.city?.trim() : supplier.city,
            state: dto.state !== undefined ? dto.state?.trim() : supplier.state,
            pincode: dto.pincode !== undefined ? dto.pincode?.trim() : supplier.pincode,
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Suppliers',
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

  async remove(id: string, userId?: string) {
    const supplier = await this.findById(id);
    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        await tx.supplier.update({
          where: { id: supplier.id },
          data: { deletedAt: new Date() },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Suppliers',
                action: 'DELETE',
                recordId: supplier.id,
              },
            });
          } catch {}
        }

        return {
          success: true,
          message: `Supplier ${supplier.companyName} (${supplier.supplierCode}) removed successfully.`,
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  private async generateSupplierCode(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const last = await tx.supplier.findFirst({
      where: { supplierCode: { startsWith: `SUP-${year}-` } },
      orderBy: { supplierCode: 'desc' },
      select: { supplierCode: true },
    });
    if (!last || !last.supplierCode) return `SUP-${year}-0001`;
    const parts = last.supplierCode.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `SUP-${year}-${String(seq).padStart(4, '0')}`;
  }

  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user.id;
    }
    const admin = await this.prisma.user.findFirst({ where: { status: 'ACTIVE' } });
    return admin?.id || 'usr-admin-01';
  }
}
