import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InstallationsController } from './installations.controller';
import { InstallationsService } from './installations.service';

@Module({
  imports: [PrismaModule],
  controllers: [InstallationsController],
  providers: [InstallationsService],
  exports: [InstallationsService],
})
export class InstallationsModule {}
