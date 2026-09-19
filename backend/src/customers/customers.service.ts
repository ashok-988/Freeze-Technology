import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CustomersService {
  private dataFilePath = path.join(process.cwd(), 'data', 'customers.json');
  private fallbackCustomers: any[] = [];

  constructor(private prisma: PrismaService) {
    this.loadFallbackData();
  }

  private loadFallbackData() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        this.fallbackCustomers = JSON.parse(raw);
      }
    } catch {
      this.fallbackCustomers = [];
    }
  }

  private saveFallbackData() {
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.dataFilePath,
        JSON.stringify(this.fallbackCustomers, null, 2),
        'utf-8',
      );
    } catch {}
  }

  async findAll(query?: CustomerQueryDto) {
    const search = query?.search?.trim()?.toLowerCase();
    const type = query?.type?.trim();

    try {
      const whereClause: any = {
        deletedAt: null,
      };

      if (type && type !== 'All') {
        whereClause.customerType = type;
      }

      if (search) {
        whereClause.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerCode: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { gstNumber: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const customers = await this.prisma.customer.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });

      if (customers.length > 0 || !search) {
        return customers;
      }
    } catch {
      // Prisma offline fallback
    }

    this.loadFallbackData();

    // File-backed fallback filter logic
    return this.fallbackCustomers.filter((c) => {
      if (c.deletedAt !== null) return false;
      if (type && type !== 'All' && c.customerType !== type) return false;
      if (search) {
        return (
          c.customerName.toLowerCase().includes(search) ||
          c.customerCode.toLowerCase().includes(search) ||
          c.mobile.includes(search) ||
          (c.email && c.email.toLowerCase().includes(search)) ||
          (c.gstNumber && c.gstNumber.toLowerCase().includes(search))
        );
      }
      return true;
    });
  }

  async findById(id: string) {
    try {
      const customer = await this.prisma.customer.findFirst({
        where: {
          OR: [{ id }, { customerCode: id }],
          deletedAt: null,
        },
        include: {
          invoices: {
            where: { deletedAt: null },
            orderBy: { invoiceDate: 'desc' },
            take: 10,
          },
          quotations: {
            where: { deletedAt: null },
            orderBy: { quotationDate: 'desc' },
            take: 10,
          },
          complaints: {
            orderBy: { createdAt: 'desc' },
            include: { jobCard: true },
            take: 10,
          },
          amcContracts: {
            orderBy: { startDate: 'desc' },
            take: 10,
          },
        },
      });

      if (customer) return customer;
    } catch {
      // Prisma offline fallback
    }

    this.loadFallbackData();

    const fallback = this.fallbackCustomers.find(
      (c) => (c.id === id || c.customerCode === id) && c.deletedAt === null,
    );

    if (!fallback) {
      throw new NotFoundException(`Customer with identifier "${id}" was not found.`);
    }

    return {
      ...fallback,
      invoices: [],
      quotations: [],
      complaints: [],
      amcContracts: [],
    };
  }

  async create(dto: CreateCustomerDto) {
    const nextCode = await this.generateNextCustomerCode();

    try {
      const customer = await this.prisma.customer.create({
        data: {
          customerCode: nextCode,
          customerName: dto.customerName,
          companyName: dto.companyName || null,
          customerType: dto.customerType,
          mobile: dto.mobile,
          alternateMobile: dto.alternateMobile || null,
          email: dto.email || null,
          gstNumber: dto.gstNumber ? dto.gstNumber.toUpperCase() : null,
          address: dto.address,
          city: dto.city || 'Chennai',
          state: dto.state || 'Tamil Nadu',
          pincode: dto.pincode,
        },
      });
      return customer;
    } catch {
      // File-backed persistent fallback creation
      this.loadFallbackData();
      const newCust = {
        id: 'cust-uuid-' + Date.now(),
        customerCode: nextCode,
        customerName: dto.customerName,
        companyName: dto.companyName || null,
        customerType: dto.customerType,
        mobile: dto.mobile,
        alternateMobile: dto.alternateMobile || null,
        email: dto.email || null,
        gstNumber: dto.gstNumber ? dto.gstNumber.toUpperCase() : null,
        address: dto.address,
        city: dto.city || 'Chennai',
        state: dto.state || 'Tamil Nadu',
        pincode: dto.pincode,
        deletedAt: null,
        createdAt: new Date().toISOString(),
      };
      this.fallbackCustomers.unshift(newCust);
      this.saveFallbackData();
      return newCust;
    }
  }

  async update(id: string, dto: UpdateCustomerDto) {
    try {
      const existing = await this.prisma.customer.findFirst({
        where: {
          OR: [{ id }, { customerCode: id }],
          deletedAt: null,
        },
      });

      if (existing) {
        return await this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            ...dto,
            gstNumber: dto.gstNumber ? dto.gstNumber.toUpperCase() : dto.gstNumber,
          },
        });
      }
    } catch {
      // Prisma offline fallback
    }

    this.loadFallbackData();
    const index = this.fallbackCustomers.findIndex(
      (c) => (c.id === id || c.customerCode === id) && c.deletedAt === null,
    );

    if (index === -1) {
      throw new NotFoundException(`Customer with identifier "${id}" was not found.`);
    }

    this.fallbackCustomers[index] = {
      ...this.fallbackCustomers[index],
      ...dto,
      gstNumber: dto.gstNumber ? dto.gstNumber.toUpperCase() : this.fallbackCustomers[index].gstNumber,
    };
    this.saveFallbackData();

    return this.fallbackCustomers[index];
  }

  async remove(id: string) {
    try {
      const existing = await this.prisma.customer.findFirst({
        where: {
          OR: [{ id }, { customerCode: id }],
          deletedAt: null,
        },
      });

      if (existing) {
        await this.prisma.customer.update({
          where: { id: existing.id },
          data: { deletedAt: new Date() },
        });
        return { success: true, message: `Customer ${existing.customerCode} deleted successfully.` };
      }
    } catch {
      // Prisma offline fallback
    }

    this.loadFallbackData();
    const index = this.fallbackCustomers.findIndex(
      (c) => (c.id === id || c.customerCode === id) && c.deletedAt === null,
    );

    if (index === -1) {
      throw new NotFoundException(`Customer with identifier "${id}" was not found.`);
    }

    this.fallbackCustomers[index].deletedAt = new Date().toISOString();
    this.saveFallbackData();

    return {
      success: true,
      message: `Customer ${this.fallbackCustomers[index].customerCode} deleted successfully.`,
    };
  }

  async getSummaryStats() {
    const all = await this.findAll();
    const total = all.length;
    const commercial = all.filter((c) => c.customerType === 'Commercial').length;
    const retail = all.filter((c) => c.customerType === 'Retail').length;
    const gstRegistered = all.filter((c) => !!c.gstNumber).length;

    return {
      total,
      commercial,
      retail,
      gstRegistered,
    };
  }

  private async generateNextCustomerCode(): Promise<string> {
    try {
      const customers = await this.prisma.customer.findMany({
        select: { customerCode: true },
      });

      let maxNum = 0;
      for (const c of customers) {
        const match = (c.customerCode || '').match(/CUST-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }

      const nextNum = (maxNum + 1).toString().padStart(3, '0');
      return `CUST-${nextNum}`;
    } catch {
      this.loadFallbackData();
      let maxNum = 0;
      for (const c of this.fallbackCustomers) {
        const match = (c.customerCode || '').match(/CUST-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = (maxNum + 1).toString().padStart(3, '0');
      return `CUST-${nextNum}`;
    }
  }
}
