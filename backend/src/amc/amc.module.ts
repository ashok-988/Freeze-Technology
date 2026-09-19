import { Module } from '@nestjs/common';
import { AMCController } from './amc.controller';
import { AMCService } from './amc.service';
import { AmcPdfService } from './amc-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [PrismaModule, ServicesModule],
  controllers: [AMCController],
  providers: [AMCService, AmcPdfService],
  exports: [AMCService, AmcPdfService],
})
export class AMCModule {}
