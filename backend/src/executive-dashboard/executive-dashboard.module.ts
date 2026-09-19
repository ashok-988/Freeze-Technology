import { Module } from '@nestjs/common';
import { ExecutiveDashboardController } from './executive-dashboard.controller';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { ExecutiveDashboardPdfService } from './executive-dashboard-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExecutiveDashboardController],
  providers: [ExecutiveDashboardService, ExecutiveDashboardPdfService],
  exports: [ExecutiveDashboardService, ExecutiveDashboardPdfService],
})
export class ExecutiveDashboardModule {}
