import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProductsService {
  private productsFilePath = path.join(process.cwd(), 'data', 'products.json');
  private categoriesFilePath = path.join(process.cwd(), 'data', 'categories.json');
  private brandsFilePath = path.join(process.cwd(), 'data', 'brands.json');

  private fallbackProducts: any[] = [];
  private fallbackCategories: any[] = [];
  private fallbackBrands: any[] = [];

  constructor(private prisma: PrismaService) {
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.productsFilePath)) {
        this.fallbackProducts = JSON.parse(fs.readFileSync(this.productsFilePath, 'utf-8'));
      }
    } catch {
      this.fallbackProducts = [];
    }

    try {
      if (fs.existsSync(this.categoriesFilePath)) {
        this.fallbackCategories = JSON.parse(fs.readFileSync(this.categoriesFilePath, 'utf-8'));
      }
    } catch {
      this.fallbackCategories = [];
    }

    try {
      if (fs.existsSync(this.brandsFilePath)) {
        this.fallbackBrands = JSON.parse(fs.readFileSync(this.brandsFilePath, 'utf-8'));
      }
    } catch {
      this.fallbackBrands = [];
    }
  }

  private saveProducts() {
    try {
      const dir = path.dirname(this.productsFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.productsFilePath, JSON.stringify(this.fallbackProducts, null, 2), 'utf-8');
    } catch {}
  }

  async findAll(query?: ProductQueryDto) {
    const search = query?.search?.trim()?.toLowerCase();
    const category = query?.category?.trim();
    const brand = query?.brand?.trim();
    const status = query?.status?.trim();

    try {
      const whereClause: any = {
        deletedAt: null,
      };

      if (category && category !== 'All') {
        whereClause.OR = [
          { categoryId: category },
          { category: { categoryName: category } },
        ];
      }

      if (brand && brand !== 'All') {
        whereClause.OR = [
          { brandId: brand },
          { brand: { brandName: brand } },
        ];
      }

      if (search) {
        whereClause.OR = [
          { productName: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      const products = await this.prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          brand: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (products.length > 0 || !search) {
        return products;
      }
    } catch {
      // Prisma offline fallback
    }

    this.loadData();

    return this.fallbackProducts.filter((p) => {
      if (p.deletedAt !== null) return false;
      if (category && category !== 'All') {
        const catMatch = p.categoryId === category || p.category?.categoryName === category;
        if (!catMatch) return false;
      }
      if (brand && brand !== 'All') {
        const brandMatch = p.brandId === brand || p.brand?.brandName === brand;
        if (!brandMatch) return false;
      }
      if (status === 'LowStock' && (p.stockQuantity || 0) > 5) return false;
      if (search) {
        return (
          p.productName.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.model.toLowerCase().includes(search) ||
          (p.serialNumber && p.serialNumber.toLowerCase().includes(search))
        );
      }
      return true;
    });
  }

  async findById(id: string) {
    try {
      const product = await this.prisma.product.findFirst({
        where: {
          OR: [{ id }, { sku: id }],
          deletedAt: null,
        },
        include: {
          category: true,
          brand: true,
          quotationItems: {
            include: { quotation: true },
            take: 10,
          },
          invoiceItems: {
            include: { invoice: true },
            take: 10,
          },
          complaints: {
            take: 10,
          },
          amcContracts: {
            take: 10,
          },
        },
      });

      if (product) return product;
    } catch {
      // Prisma offline fallback
    }

    this.loadData();

    const fallback = this.fallbackProducts.find(
      (p) => (p.id === id || p.sku === id) && p.deletedAt === null,
    );

    if (!fallback) {
      throw new NotFoundException(`Product with identifier "${id}" was not found.`);
    }

    return {
      ...fallback,
      quotationItems: [],
      invoiceItems: [],
      complaints: [],
      amcContracts: [],
    };
  }

  async getCategories() {
    try {
      const categories = await this.prisma.category.findMany({
        orderBy: { categoryName: 'asc' },
      });
      if (categories.length > 0) return categories;
    } catch {}

    this.loadData();
    return this.fallbackCategories;
  }

  async getBrands() {
    try {
      const brands = await this.prisma.brand.findMany({
        orderBy: { brandName: 'asc' },
      });
      if (brands.length > 0) return brands;
    } catch {}

    this.loadData();
    return this.fallbackBrands;
  }

  async create(dto: CreateProductDto) {
    const sku = dto.sku?.trim() || (await this.generateNextSku(dto.categoryId));

    try {
      const created = await this.prisma.product.create({
        data: {
          sku,
          productName: dto.productName,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          model: dto.model,
          serialNumber: dto.serialNumber || null,
          warrantyMonths: dto.warrantyMonths !== undefined ? dto.warrantyMonths : 12,
          purchasePrice: Number(dto.purchasePrice),
          sellingPrice: Number(dto.sellingPrice),
          taxRate: dto.taxRate !== undefined ? Number(dto.taxRate) : 18.0,
          stockQuantity: dto.stockQuantity !== undefined ? Number(dto.stockQuantity) : 0,
        },
        include: {
          category: true,
          brand: true,
        },
      });
      return created;
    } catch {
      // File-backed persistent fallback
      this.loadData();

      const catObj = this.fallbackCategories.find((c) => c.id === dto.categoryId || c.categoryName === dto.categoryId) || {
        id: dto.categoryId,
        categoryName: 'General',
      };
      const brandObj = this.fallbackBrands.find((b) => b.id === dto.brandId || b.brandName === dto.brandId) || {
        id: dto.brandId,
        brandName: 'Generic',
      };

      const newProduct = {
        id: 'prod-uuid-' + Date.now(),
        sku,
        productName: dto.productName,
        categoryId: catObj.id,
        brandId: brandObj.id,
        model: dto.model,
        serialNumber: dto.serialNumber || null,
        warrantyMonths: dto.warrantyMonths !== undefined ? dto.warrantyMonths : 12,
        purchasePrice: Number(dto.purchasePrice),
        sellingPrice: Number(dto.sellingPrice),
        taxRate: dto.taxRate !== undefined ? Number(dto.taxRate) : 18.0,
        stockQuantity: dto.stockQuantity !== undefined ? Number(dto.stockQuantity) : 0,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        category: catObj,
        brand: brandObj,
      };

      this.fallbackProducts.unshift(newProduct);
      this.saveProducts();
      return newProduct;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    try {
      const existing = await this.prisma.product.findFirst({
        where: {
          OR: [{ id }, { sku: id }],
          deletedAt: null,
        },
      });

      if (existing) {
        return await this.prisma.product.update({
          where: { id: existing.id },
          data: {
            ...dto,
            purchasePrice: dto.purchasePrice !== undefined ? Number(dto.purchasePrice) : undefined,
            sellingPrice: dto.sellingPrice !== undefined ? Number(dto.sellingPrice) : undefined,
            taxRate: dto.taxRate !== undefined ? Number(dto.taxRate) : undefined,
            stockQuantity: dto.stockQuantity !== undefined ? Number(dto.stockQuantity) : undefined,
            warrantyMonths: dto.warrantyMonths !== undefined ? Number(dto.warrantyMonths) : undefined,
          },
          include: {
            category: true,
            brand: true,
          },
        });
      }
    } catch {}

    this.loadData();
    const index = this.fallbackProducts.findIndex(
      (p) => (p.id === id || p.sku === id) && p.deletedAt === null,
    );

    if (index === -1) {
      throw new NotFoundException(`Product with identifier "${id}" was not found.`);
    }

    if (dto.categoryId) {
      const catObj = this.fallbackCategories.find((c) => c.id === dto.categoryId || c.categoryName === dto.categoryId);
      if (catObj) this.fallbackProducts[index].category = catObj;
    }
    if (dto.brandId) {
      const brandObj = this.fallbackBrands.find((b) => b.id === dto.brandId || b.brandName === dto.brandId);
      if (brandObj) this.fallbackProducts[index].brand = brandObj;
    }

    this.fallbackProducts[index] = {
      ...this.fallbackProducts[index],
      ...dto,
      purchasePrice: dto.purchasePrice !== undefined ? Number(dto.purchasePrice) : this.fallbackProducts[index].purchasePrice,
      sellingPrice: dto.sellingPrice !== undefined ? Number(dto.sellingPrice) : this.fallbackProducts[index].sellingPrice,
      taxRate: dto.taxRate !== undefined ? Number(dto.taxRate) : this.fallbackProducts[index].taxRate,
      stockQuantity: dto.stockQuantity !== undefined ? Number(dto.stockQuantity) : this.fallbackProducts[index].stockQuantity,
      warrantyMonths: dto.warrantyMonths !== undefined ? Number(dto.warrantyMonths) : this.fallbackProducts[index].warrantyMonths,
    };

    this.saveProducts();
    return this.fallbackProducts[index];
  }

  async remove(id: string) {
    try {
      const existing = await this.prisma.product.findFirst({
        where: {
          OR: [{ id }, { sku: id }],
          deletedAt: null,
        },
      });

      if (existing) {
        await this.prisma.product.update({
          where: { id: existing.id },
          data: { deletedAt: new Date() },
        });
        return { success: true, message: `Product ${existing.sku} deleted successfully.` };
      }
    } catch {}

    this.loadData();
    const index = this.fallbackProducts.findIndex(
      (p) => (p.id === id || p.sku === id) && p.deletedAt === null,
    );

    if (index === -1) {
      throw new NotFoundException(`Product with identifier "${id}" was not found.`);
    }

    this.fallbackProducts[index].deletedAt = new Date().toISOString();
    this.saveProducts();

    return {
      success: true,
      message: `Product ${this.fallbackProducts[index].sku} deleted successfully.`,
    };
  }

  async getSummaryStats() {
    const all = await this.findAll();
    const total = all.length;
    const lowStock = all.filter((p) => (p.stockQuantity || 0) <= 5 && (p.category?.categoryName !== 'Service')).length;
    const totalStock = all.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
    const totalInventoryValue = all.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.sellingPrice || 0), 0);
    const categoriesCount = new Set(all.map((p) => p.category?.categoryName || p.categoryId)).size;

    return {
      total,
      lowStock,
      totalStock,
      totalInventoryValue,
      categoriesCount,
    };
  }

  private async generateNextSku(categoryId?: string): Promise<string> {
    let prefix = 'PROD';
    if (categoryId) {
      this.loadData();
      const cat = this.fallbackCategories.find((c) => c.id === categoryId);
      if (cat?.categoryName === 'AC') prefix = 'AC-PAN';
      else if (cat?.categoryName === 'Service') prefix = 'SRV';
      else if (cat?.categoryName === 'Spare Parts') prefix = 'SP';
      else if (cat?.categoryName === 'Refrigerator') prefix = 'REF';
    }

    try {
      const products = await this.prisma.product.findMany({
        where: { sku: { startsWith: `${prefix}-` } },
        select: { sku: true },
      });

      let maxNum = 0;
      for (const p of products) {
        const match = (p.sku || '').match(new RegExp(`^${prefix}-(\\d+)`, 'i'));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }

      const num = (maxNum + 1).toString().padStart(3, '0');
      return `${prefix}-${num}`;
    } catch {
      this.loadData();
      let maxNum = 0;
      for (const p of this.fallbackProducts) {
        const match = (p.sku || '').match(new RegExp(`^${prefix}-(\\d+)`, 'i'));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const num = (maxNum + 1).toString().padStart(3, '0');
      return `${prefix}-${num}`;
    }
  }
}
