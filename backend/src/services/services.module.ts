import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { PdfService } from './pdf.service';
import { ExcelService } from './excel.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServicesController],
  providers: [ServicesService, PdfService, ExcelService],
  exports: [ServicesService, PdfService, ExcelService],
})
export class ServicesModule {}
