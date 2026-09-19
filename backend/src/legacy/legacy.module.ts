import { Module } from '@nestjs/common';
import { LegacyController } from './legacy.controller';
import { PdfService } from '../services/pdf.service';
import { ExcelService } from '../services/excel.service';

@Module({
  controllers: [LegacyController],
  providers: [PdfService, ExcelService],
  exports: [PdfService, ExcelService],
})
export class LegacyModule {}
