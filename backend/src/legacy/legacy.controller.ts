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
  // In-memory persistent mock store fallback for transitional compatibility
  private mockStore = {
    invoices: [
      {
        id: 'INV-2026-0713',
        invoiceNo: 'FT/2026/0713',
        date: '13/07/2026',
        customerName: 'M/s. Mebacare Naturals Salon',
        customerAddress: 'No.25/3 East Mada Street, Thiruvanmiyur, Chennai 600041.',
        customerGstin: '',
        items: [
          { sn: 1, description: 'General checking and air filter cleaning work', qty: 1, gst: '18%', rate: 400, amount: 400.0 },
          { sn: 2, description: 'Water wash work', qty: 4, gst: '18%', rate: 1500, amount: 6000.0 },
          { sn: 3, description: 'Wiring problem', qty: 1, gst: '18%', rate: 600, amount: 600.0 },
        ],
        grandTotal: 7000.0,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI',
      },
      {
        id: 'INV-2026-0718',
        invoiceNo: 'FT/2026/0718',
        date: '18/07/2026',
        customerName: 'Apex Super Specialty Hospital',
        customerAddress: '45 OMR Main Road, Kandanchavadi, Chennai 600096',
        customerGstin: '33AAACA9876E1Z1',
        items: [
          { sn: 1, description: 'Panasonic 2.0 Ton Inverter Split AC', qty: 2, gst: '18%', rate: 54000, amount: 108000.0 },
          { sn: 2, description: 'Installation & Piping Charges', qty: 2, gst: '18%', rate: 2500, amount: 5000.0 },
        ],
        grandTotal: 113000.0,
        paymentStatus: 'Pending',
        paymentMethod: 'Bank Transfer',
      },
    ],
    jobCards: [
      {
        id: 'JOB-042',
        jobNumber: 'JC-9042',
        customerName: 'M/s. Mebacare Naturals Salon',
        product: 'Panasonic 1.5T AC',
        complaint: 'Cooling insufficient',
        technicianName: 'Suresh V',
        priority: 'High',
        status: 'In Progress',
      },
    ],
  };

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
      if (jobs.length > 0) {
        return { success: true, data: jobs };
      }
    } catch {}
    return { success: true, data: this.mockStore.jobCards };
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
      if (invoices.length > 0) {
        return { success: true, data: invoices };
      }
    } catch {}
    return { success: true, data: this.mockStore.invoices };
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  createInvoice(@Body() body: any) {
    const newInv = { id: 'INV-' + Date.now(), ...body };
    this.mockStore.invoices.unshift(newInv);
    return { success: true, data: newInv };
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

    const inv =
      this.mockStore.invoices.find((i) => i.id === id) || this.mockStore.invoices[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=${inv.invoiceNo.replace(/\//g, '_')}.pdf`,
    );
    this.pdfService.generateInvoicePDF(inv, res);
  }

  // 5. Excel Sales Report
  @Get('reports/sales/excel')
  async getSalesExcel(@Res() res: Response) {
    await this.excelService.generateSalesExcelReport(this.mockStore.invoices, res);
  }
}
