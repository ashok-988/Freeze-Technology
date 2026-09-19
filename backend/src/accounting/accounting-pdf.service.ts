import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { AccountingReportsService } from './accounting-reports.service';
import { AccountingCoaService } from './accounting-coa.service';
import { AccountingJournalService } from './accounting-journal.service';

@Injectable()
export class AccountingPdfService {
  private readonly logger = new Logger(AccountingPdfService.name);

  constructor(
    private reportsService: AccountingReportsService,
    private coaService: AccountingCoaService,
    private journalService: AccountingJournalService,
  ) {}

  private drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
    doc.rect(0, 0, doc.page.width, 70).fill('#0F4C81'); // Brand color

    doc
      .fillColor('#FFFFFF')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY', 40, 16, { characterSpacing: 1 });

    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Authorised Panasonic Channel Partner | Commercial & Residential HVAC', 40, 36)
      .text('GSTIN: 33BKCPD7319A2ZU | Chennai, Tamil Nadu', 40, 48);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(title.toUpperCase(), doc.page.width - 260, 20, { width: 220, align: 'right' });

    if (subtitle) {
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(subtitle, doc.page.width - 260, 42, { width: 220, align: 'right' });
    }

    doc.fillColor('#333333').font('Helvetica');
    doc.y = 85;
  }

  private drawFooter(doc: PDFKit.PDFDocument) {
    const bottom = doc.page.height - 35;
    doc.rect(40, bottom - 10, doc.page.width - 80, 0.5).fill('#E2E8F0');
    doc
      .fontSize(7)
      .fillColor('#64748B')
      .text(`Generated: ${new Date().toLocaleString('en-IN')} | Server-Authoritative Accounting Ledger | Confidential`, 40, bottom, {
        align: 'left',
      });
  }

  /**
   * 1. Chart of Accounts PDF
   */
  async generateCoaPdf(): Promise<Buffer> {
    const accounts = await this.coaService.getAccounts({});

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.drawHeader(doc, 'Chart of Accounts', `Active Master Ledger: ${accounts.length} Accounts`);

      // Table Header
      let y = doc.y;
      doc.rect(40, y, doc.page.width - 80, 20).fill('#F1F5F9');
      doc.fillColor('#1E293B').fontSize(8).font('Helvetica-Bold');
      doc.text('CODE', 45, y + 6);
      doc.text('ACCOUNT NAME', 90, y + 6);
      doc.text('TYPE', 250, y + 6);
      doc.text('GROUP', 330, y + 6);
      doc.text('NORMAL', 430, y + 6);
      doc.text('BALANCE (INR)', 480, y + 6, { width: 75, align: 'right' });

      y += 24;
      doc.font('Helvetica').fontSize(7.5);

      accounts.forEach((acc, i) => {
        if (y > doc.page.height - 50) {
          this.drawFooter(doc);
          doc.addPage();
          this.drawHeader(doc, 'Chart of Accounts (Contd.)');
          y = doc.y;
        }

        const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, y - 2, doc.page.width - 80, 16).fill(bg);

        doc.fillColor('#0F172A');
        doc.text(acc.accountCode, 45, y + 2);
        doc.text(acc.accountName, 90, y + 2, { width: 155, ellipsis: true });
        doc.text(acc.accountType, 250, y + 2);
        doc.text(acc.accountGroup, 330, y + 2, { width: 95, ellipsis: true });
        doc.text(acc.normalBalance, 430, y + 2);
        doc.text(acc.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 480, y + 2, {
          width: 75,
          align: 'right',
        });

        y += 16;
      });

      this.drawFooter(doc);
      doc.end();
    });
  }

  /**
   * 2. Trial Balance PDF
   */
  async generateTrialBalancePdf(): Promise<Buffer> {
    const tb = await this.reportsService.getTrialBalance({});

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.drawHeader(doc, 'Trial Balance', `As on ${new Date().toLocaleDateString('en-IN')} | ${tb.status}`);

      let y = doc.y;
      doc.rect(40, y, doc.page.width - 80, 20).fill('#0F4C81');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text('CODE', 45, y + 6);
      doc.text('ACCOUNT TITLE', 95, y + 6);
      doc.text('ACCOUNT TYPE', 280, y + 6);
      doc.text('DEBIT (INR)', 370, y + 6, { width: 90, align: 'right' });
      doc.text('CREDIT (INR)', 465, y + 6, { width: 90, align: 'right' });

      y += 24;
      doc.font('Helvetica').fontSize(7.5);

      tb.rows.forEach((r, i) => {
        if (y > doc.page.height - 60) {
          this.drawFooter(doc);
          doc.addPage();
          this.drawHeader(doc, 'Trial Balance (Contd.)');
          y = doc.y;
        }

        const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, y - 2, doc.page.width - 80, 16).fill(bg);

        doc.fillColor('#1E293B');
        doc.text(r.accountCode, 45, y + 2);
        doc.text(r.accountName, 95, y + 2, { width: 180, ellipsis: true });
        doc.text(r.accountType, 280, y + 2);
        doc.text(
          r.debitBalance > 0 ? r.debitBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-',
          370,
          y + 2,
          { width: 90, align: 'right' },
        );
        doc.text(
          r.creditBalance > 0 ? r.creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-',
          465,
          y + 2,
          { width: 90, align: 'right' },
        );

        y += 16;
      });

      // Total Row
      y += 5;
      doc.rect(40, y, doc.page.width - 80, 22).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('TOTAL GENERAL LEDGER BALANCES', 45, y + 6);
      doc.text(tb.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 370, y + 6, {
        width: 90,
        align: 'right',
      });
      doc.text(tb.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 465, y + 6, {
        width: 90,
        align: 'right',
      });

      this.drawFooter(doc);
      doc.end();
    });
  }

  /**
   * 3. Profit & Loss PDF
   */
  async generateProfitAndLossPdf(): Promise<Buffer> {
    const pnl = await this.reportsService.getProfitAndLoss({});

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.drawHeader(doc, 'Profit & Loss Statement', `Reporting Period: ${pnl.period}`);

      let y = doc.y;

      // Section 1: Revenue
      doc.rect(40, y, doc.page.width - 80, 18).fill('#F1F5F9');
      doc.fillColor('#0F4C81').fontSize(8.5).font('Helvetica-Bold');
      doc.text('1. OPERATING REVENUE', 45, y + 5);
      doc.text(pnl.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y + 5, {
        width: 105,
        align: 'right',
      });
      y += 22;

      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      pnl.revenue.items.forEach((item) => {
        doc.text(`${item.code} - ${item.name}`, 55, y);
        doc.text(item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y, {
          width: 105,
          align: 'right',
        });
        y += 15;
      });

      // Section 2: COGS
      y += 5;
      doc.rect(40, y, doc.page.width - 80, 18).fill('#F1F5F9');
      doc.fillColor('#0F4C81').fontSize(8.5).font('Helvetica-Bold');
      doc.text('2. COST OF GOODS SOLD (COGS)', 45, y + 5);
      doc.text(pnl.costOfGoodsSold.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y + 5, {
        width: 105,
        align: 'right',
      });
      y += 22;

      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      pnl.costOfGoodsSold.items.forEach((item) => {
        doc.text(`${item.code} - ${item.name}`, 55, y);
        doc.text(item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y, {
          width: 105,
          align: 'right',
        });
        y += 15;
      });

      // Gross Profit Banner
      y += 5;
      doc.rect(40, y, doc.page.width - 80, 20).fill('#E0F2FE');
      doc.fillColor('#0369A1').fontSize(9).font('Helvetica-Bold');
      doc.text(`GROSS PROFIT (Margin: ${pnl.grossMarginPct}%)`, 45, y + 6);
      doc.text(pnl.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y + 6, {
        width: 105,
        align: 'right',
      });
      y += 26;

      // Section 3: Operating Expenses
      doc.rect(40, y, doc.page.width - 80, 18).fill('#F1F5F9');
      doc.fillColor('#0F4C81').fontSize(8.5).font('Helvetica-Bold');
      doc.text('3. OPERATING EXPENSES & OVERHEADS', 45, y + 5);
      doc.text(pnl.operatingExpenses.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y + 5, {
        width: 105,
        align: 'right',
      });
      y += 22;

      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      pnl.operatingExpenses.items.forEach((item) => {
        doc.text(`${item.code} - ${item.name}`, 55, y);
        doc.text(item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y, {
          width: 105,
          align: 'right',
        });
        y += 15;
      });

      // Net Profit Banner
      y += 10;
      doc.rect(40, y, doc.page.width - 80, 24).fill(pnl.netProfit >= 0 ? '#10B981' : '#EF4444');
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text(`NET PROFIT / (LOSS) (Net Margin: ${pnl.netMarginPct}%)`, 45, y + 7);
      doc.text(pnl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y + 7, {
        width: 105,
        align: 'right',
      });

      this.drawFooter(doc);
      doc.end();
    });
  }

  /**
   * 4. Balance Sheet PDF
   */
  async generateBalanceSheetPdf(): Promise<Buffer> {
    const bs = await this.reportsService.getBalanceSheet({});

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.drawHeader(doc, 'Balance Sheet', `As on ${new Date().toLocaleDateString('en-IN')}`);

      let y = doc.y;

      // Assets
      doc.rect(40, y, doc.page.width - 80, 18).fill('#0F4C81');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('I. TOTAL ASSETS', 45, y + 5);
      doc.text(bs.assets.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y + 5, {
        width: 105,
        align: 'right',
      });
      y += 22;

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text('Current Assets:', 45, y);
      y += 14;
      doc.font('Helvetica').fillColor('#334155');
      bs.assets.currentAssets.items.forEach((item: any) => {
        doc.text(`${item.code} - ${item.name}`, 55, y);
        doc.text(item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y, { width: 105, align: 'right' });
        y += 14;
      });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text('Fixed Assets:', 45, y);
      y += 14;
      doc.font('Helvetica').fillColor('#334155');
      bs.assets.fixedAssets.items.forEach((item: any) => {
        doc.text(`${item.code} - ${item.name}`, 55, y);
        doc.text(item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y, { width: 105, align: 'right' });
        y += 14;
      });

      // Liabilities
      y += 8;
      doc.rect(40, y, doc.page.width - 80, 18).fill('#0F4C81');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('II. LIABILITIES & EQUITY', 45, y + 5);
      doc.text(bs.totalLiabilitiesAndEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y + 5, {
        width: 105,
        align: 'right',
      });
      y += 22;

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text('Current Liabilities:', 45, y);
      y += 14;
      doc.font('Helvetica').fillColor('#334155');
      bs.liabilities.currentLiabilities.items.forEach((item: any) => {
        doc.text(`${item.code} - ${item.name}`, 55, y);
        doc.text(item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y, { width: 105, align: 'right' });
        y += 14;
      });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text('Equity & Reserves:', 45, y);
      y += 14;
      doc.font('Helvetica').fillColor('#334155');
      bs.equity.items.forEach((item: any) => {
        doc.text(`${item.code} - ${item.name}`, 55, y);
        doc.text(item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450, y, { width: 105, align: 'right' });
        y += 14;
      });

      this.drawFooter(doc);
      doc.end();
    });
  }

  /**
   * 5. General Ledger PDF
   */
  async generateGeneralLedgerPdf(accountId?: string): Promise<Buffer> {
    const ledger = await this.reportsService.getGeneralLedger({ accountId });

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.drawHeader(doc, 'General Ledger', `Account Ledger Postings`);

      let y = doc.y;

      ledger.slice(0, 15).forEach((acc) => {
        if (y > doc.page.height - 80) {
          this.drawFooter(doc);
          doc.addPage();
          this.drawHeader(doc, 'General Ledger (Contd.)');
          y = doc.y;
        }

        doc.rect(40, y, doc.page.width - 80, 18).fill('#F1F5F9');
        doc.fillColor('#0F4C81').fontSize(8).font('Helvetica-Bold');
        doc.text(`[${acc.accountCode}] ${acc.accountName} (${acc.accountType})`, 45, y + 5);
        doc.text(`Balance: Rs. ${acc.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 420, y + 5, {
          width: 135,
          align: 'right',
        });
        y += 22;

        if (acc.entries.length === 0) {
          doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text('No journal postings recorded.', 55, y);
          y += 14;
        } else {
          doc.font('Helvetica').fontSize(7).fillColor('#334155');
          acc.entries.slice(0, 10).forEach((e) => {
            doc.text(`${new Date(e.entryDate).toLocaleDateString('en-IN')} | ${e.journalNumber} | ${e.narration}`, 55, y, {
              width: 250,
              ellipsis: true,
            });
            doc.text(e.debit > 0 ? `DR: ${e.debit.toFixed(2)}` : '', 310, y, { width: 70, align: 'right' });
            doc.text(e.credit > 0 ? `CR: ${e.credit.toFixed(2)}` : '', 390, y, { width: 70, align: 'right' });
            doc.text(`Bal: ${e.runningBalance.toFixed(2)}`, 470, y, { width: 85, align: 'right' });
            y += 12;
          });
        }
        y += 6;
      });

      this.drawFooter(doc);
      doc.end();
    });
  }

  /**
   * 6. Cash Book PDF
   */
  async generateCashBookPdf(): Promise<Buffer> {
    const cash = await this.reportsService.getCashBook({});

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.drawHeader(
        doc,
        'Cash & Bank Book',
        `Closing Cash/Bank Balance: Rs. ${cash.summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      );

      let y = doc.y;

      cash.accounts.forEach((acc) => {
        doc.rect(40, y, doc.page.width - 80, 18).fill('#F1F5F9');
        doc.fillColor('#0F4C81').fontSize(8.5).font('Helvetica-Bold');
        doc.text(`${acc.accountCode} - ${acc.accountName}`, 45, y + 5);
        doc.text(`Closing: Rs. ${acc.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 420, y + 5, {
          width: 135,
          align: 'right',
        });
        y += 22;

        if (acc.transactions.length === 0) {
          doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text('No cash transactions in this account.', 55, y);
          y += 14;
        } else {
          doc.font('Helvetica').fontSize(7).fillColor('#334155');
          acc.transactions.slice(0, 15).forEach((t) => {
            doc.text(`${new Date(t.entryDate).toLocaleDateString('en-IN')} | ${t.journalNumber} | ${t.narration}`, 55, y, {
              width: 250,
              ellipsis: true,
            });
            doc.text(t.receipt > 0 ? `+${t.receipt.toFixed(2)}` : '', 310, y, { width: 70, align: 'right' });
            doc.text(t.payment > 0 ? `-${t.payment.toFixed(2)}` : '', 390, y, { width: 70, align: 'right' });
            doc.text(`Bal: ${t.runningBalance.toFixed(2)}`, 470, y, { width: 85, align: 'right' });
            y += 12;
          });
        }
        y += 8;
      });

      this.drawFooter(doc);
      doc.end();
    });
  }

  /**
   * 7. Journal Register PDF
   */
  async generateJournalRegisterPdf(): Promise<Buffer> {
    const journals = await this.journalService.getJournalEntries({ limit: '100' });

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.drawHeader(doc, 'Journal Register', `Total Entries: ${journals.total}`);

      let y = doc.y;

      journals.items.slice(0, 20).forEach((j: any) => {
        if (y > doc.page.height - 70) {
          this.drawFooter(doc);
          doc.addPage();
          this.drawHeader(doc, 'Journal Register (Contd.)');
          y = doc.y;
        }

        doc.rect(40, y, doc.page.width - 80, 16).fill('#F1F5F9');
        doc.fillColor('#0F4C81').fontSize(7.5).font('Helvetica-Bold');
        doc.text(`${j.journalNumber} | ${new Date(j.entryDate).toLocaleDateString('en-IN')} | ${j.referenceType}`, 45, y + 4);
        doc.text(`Total: Rs. ${j.totalDebit.toFixed(2)} | Status: ${j.status}`, 350, y + 4, { width: 205, align: 'right' });
        y += 18;

        doc.font('Helvetica').fontSize(7).fillColor('#334155');
        doc.text(`Narration: ${j.narration}`, 55, y);
        y += 12;

        j.lines.forEach((l: any) => {
          doc.text(`  • [${l.account?.accountCode}] ${l.account?.accountName}`, 65, y, { width: 250, ellipsis: true });
          doc.text(l.debit > 0 ? `DR: ${l.debit.toFixed(2)}` : '', 330, y, { width: 75, align: 'right' });
          doc.text(l.credit > 0 ? `CR: ${l.credit.toFixed(2)}` : '', 415, y, { width: 75, align: 'right' });
          y += 10;
        });

        y += 6;
      });

      this.drawFooter(doc);
      doc.end();
    });
  }

  /**
   * 8. Accounting Reconciliation PDF
   */
  async generateReconciliationPdf(): Promise<Buffer> {
    const rec = await this.reportsService.getReconciliation();

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.drawHeader(doc, 'Accounting Reconciliation', `Subledger vs General Ledger Statement`);

      let y = doc.y;

      // AR
      doc.rect(40, y, doc.page.width - 80, 20).fill('#0F4C81');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('1. ACCOUNTS RECEIVABLE (TRADE DEBTORS)', 45, y + 6);
      doc.text(`Status: ${rec.accountsReceivable.status}`, 420, y + 6, { width: 135, align: 'right' });
      y += 24;

      doc.font('Helvetica').fontSize(8).fillColor('#1E293B');
      doc.text(`Invoices Subledger Outstanding: Rs. ${rec.accountsReceivable.subledgerTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);
      y += 14;
      doc.text(`General Ledger Balance (Code 1030): Rs. ${rec.accountsReceivable.glTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);
      y += 14;
      doc.text(`Net Reconciliation Variance: Rs. ${rec.accountsReceivable.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);
      y += 20;

      // AP
      doc.rect(40, y, doc.page.width - 80, 20).fill('#0F4C81');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('2. ACCOUNTS PAYABLE (TRADE CREDITORS)', 45, y + 6);
      doc.text(`Status: ${rec.accountsPayable.status}`, 420, y + 6, { width: 135, align: 'right' });
      y += 24;

      doc.font('Helvetica').fontSize(8).fillColor('#1E293B');
      doc.text(`Vendor Bills Subledger Outstanding: Rs. ${rec.accountsPayable.subledgerTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);
      y += 14;
      doc.text(`General Ledger Balance (Code 2010): Rs. ${rec.accountsPayable.glTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);
      y += 14;
      doc.text(`Net Reconciliation Variance: Rs. ${rec.accountsPayable.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);
      y += 20;

      // GST
      doc.rect(40, y, doc.page.width - 80, 20).fill('#0F4C81');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('3. GST TAX POSITION', 45, y + 6);
      doc.text(`Status: ${rec.gstPosition.status}`, 420, y + 6, { width: 135, align: 'right' });
      y += 24;

      doc.font('Helvetica').fontSize(8).fillColor('#1E293B');
      doc.text(`Output GST Balance (Liability): Rs. ${rec.gstPosition.outputGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);
      y += 14;
      doc.text(`Input GST Balance (Tax Credit): Rs. ${rec.gstPosition.inputGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);
      y += 14;
      doc.text(`Estimated Net GST Liability: Rs. ${rec.gstPosition.netGstLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, y);

      this.drawFooter(doc);
      doc.end();
    });
  }
}
