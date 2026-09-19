import { Module } from '@nestjs/common';
import { PayablesService } from './payables.service';
import { PayablesPdfService } from './payables-pdf.service';
import { PayablesController } from './payables.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PayablesController],
  providers: [PayablesService, PayablesPdfService],
  exports: [PayablesService, PayablesPdfService],
})
export class PayablesModule {}
