import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollPdfService } from './payroll-pdf.service';
import { PayrollController } from './payroll.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollPdfService],
  exports: [PayrollService, PayrollPdfService],
})
export class PayrollModule {}
