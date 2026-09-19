import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingController } from './accounting.controller';
import { AccountingCoaService } from './accounting-coa.service';
import { AccountingJournalService } from './accounting-journal.service';
import { AccountingSyncService } from './accounting-sync.service';
import { AccountingReportsService } from './accounting-reports.service';
import { AccountingPdfService } from './accounting-pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [
    AccountingCoaService,
    AccountingJournalService,
    AccountingSyncService,
    AccountingReportsService,
    AccountingPdfService,
  ],
  exports: [
    AccountingCoaService,
    AccountingJournalService,
    AccountingSyncService,
    AccountingReportsService,
    AccountingPdfService,
  ],
})
export class AccountingModule {}
