import { Module } from '@nestjs/common';
import { PreventiveMaintenanceController } from './preventive-maintenance.controller';
import { PreventiveMaintenanceService } from './preventive-maintenance.service';
import { PmPdfService } from './pm-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PreventiveMaintenanceController],
  providers: [PreventiveMaintenanceService, PmPdfService],
  exports: [PreventiveMaintenanceService, PmPdfService],
})
export class PreventiveMaintenanceModule {}
