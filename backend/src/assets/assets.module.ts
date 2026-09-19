import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetsPdfService } from './assets-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetsController],
  providers: [AssetsService, AssetsPdfService],
  exports: [AssetsService, AssetsPdfService],
})
export class AssetsModule {}
