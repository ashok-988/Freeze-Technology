import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from '../services/pdf.service';
import { ExcelService } from '../services/excel.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class LegacyController {
  constructor(
    private pdfService: PdfService,
    private excelService: ExcelService,
    private prisma: PrismaService,
  ) {}

  // 1. Health Check
  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      system: 'Freeze Technology ERP Backend API',
      framework: 'NestJS',
      timestamp: new Date().toISOString(),
    };
  }

  // 2. Job Cards
  @Get('jobcards')
  async getJobCards() {
    try {
      const jobs = await this.prisma.jobCard.findMany({
        include: {
          complaint: { include: { customer: true, product: true } },
          technician: true,
          serviceHistory: true,
          serviceStatusLogs: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: jobs };
    } catch (err) {
      return { success: true, data: [] };
    }
  }

  // 3. Invoices
  @Get('invoices')
  async getInvoices() {
    try {
      const invoices = await this.prisma.invoice.findMany({
        where: { deletedAt: null },
        include: { customer: true, items: true, payments: true },
        orderBy: { invoiceDate: 'desc' },
      });
      return { success: true, data: invoices };
    } catch (err) {
      return { success: true, data: [] };
    }
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Body() body: any) {
    try {
      let createdById = body.createdById || body.userId;
      if (!createdById) {
        const adminUser = await this.prisma.user.findFirst({ select: { id: true } });
        createdById = adminUser?.id;
      }

      const invoice = await (this.prisma.invoice as any).create({
        data: {
          invoiceNumber: body.invoiceNumber || body.invoiceNo || `FT/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`,
          invoiceDate: body.date ? new Date(body.date) : new Date(),
          customerId: body.customerId,
          subtotal: Number(body.subtotal || body.grandTotal || 0),
          discount: Number(body.discount || 0),
          gstAmount: Number(body.gstAmount || 0),
          grandTotal: Number(body.grandTotal || 0),
          paymentStatus: body.paymentStatus || 'Pending',
          paymentMethod: body.paymentMethod || 'Bank Transfer',
          createdById: createdById,
        },
      });
      return { success: true, data: invoice };
    } catch (err) {
      return { success: false, message: 'Failed to create invoice' };
    }
  }

  // 4. PDF Generation (Document 1 Parity)
  @Get('invoices/:id/pdf')
  async getInvoicePDF(@Param('id') id: string, @Res() res: Response) {
    try {
      const dbInvoice = await this.prisma.invoice.findFirst({
        where: {
          OR: [{ id }, { invoiceNumber: id }],
          deletedAt: null,
        },
        include: { customer: true, items: true },
      });
      if (dbInvoice) {
        const formatted = {
          invoiceNo: dbInvoice.invoiceNumber,
          date: new Date(dbInvoice.invoiceDate).toLocaleDateString('en-GB'),
          customerName: dbInvoice.customer?.companyName || dbInvoice.customer?.customerName || '',
          customerAddress: `${dbInvoice.customer?.address || ''}\n${dbInvoice.customer?.city || 'Chennai'} ${dbInvoice.customer?.pincode || ''}`,
          customerGstin: dbInvoice.customer?.gstNumber || '',
          items: dbInvoice.items.map((item, idx) => ({
            sn: idx + 1,
            description: item.description,
            qty: item.quantity,
            gst: '18%',
            rate: item.sellingPrice,
            amount: item.sellingPrice * item.quantity,
          })),
          grandTotal: dbInvoice.grandTotal,
        };
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `inline; filename=${dbInvoice.invoiceNumber.replace(/\//g, '_')}.pdf`,
        );
        return this.pdfService.generateInvoicePDF(formatted, res);
      }
    } catch {}

    return res.status(HttpStatus.NOT_FOUND).json({
      success: false,
      message: `Invoice with id or number '${id}' not found.`,
    });
  }

  // 5. Excel Sales Report
  @Get('reports/sales/excel')
  async getSalesExcel(@Res() res: Response) {
    try {
      const invoices = await this.prisma.invoice.findMany({
        where: { deletedAt: null },
        include: { customer: true, items: true, payments: true },
        orderBy: { invoiceDate: 'desc' },
      });
      await this.excelService.generateSalesExcelReport(invoices, res);
    } catch {
      await this.excelService.generateSalesExcelReport([], res);
    }
  }
}
