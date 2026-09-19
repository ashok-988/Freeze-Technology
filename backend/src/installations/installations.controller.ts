import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InstallationsService } from './installations.service';
import { CreateInstallationDto } from './dto/create-installation.dto';
import { UpdateInstallationDto } from './dto/update-installation.dto';
import { InstallationQueryDto } from './dto/installation-query.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateInstallationStatusDto } from './dto/update-installation-status.dto';
import { CompleteInstallationDto } from './dto/complete-installation.dto';

@Controller('installations')
export class InstallationsController {
  constructor(private readonly installationsService: InstallationsService) {}

  @Get()
  async findAll(@Query() query: InstallationQueryDto) {
    const data = await this.installationsService.findAll(query);
    return {
      success: true,
      data,
    };
  }

  @Get('stats')
  async getStats() {
    const data = await this.installationsService.getStats();
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.installationsService.findById(id);
    return {
      success: true,
      data,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateInstallationDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.installationsService.create(createDto, userId);
    return {
      success: true,
      message: `Installation ${data.installationNumber} created successfully.`,
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInstallationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.installationsService.update(id, updateDto, userId);
    return {
      success: true,
      message: `Installation ${data.installationNumber} updated successfully.`,
      data,
    };
  }

  @Patch(':id/assign')
  async assignTechnician(
    @Param('id') id: string,
    @Body() assignDto: AssignTechnicianDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.installationsService.assignTechnician(id, assignDto, userId);
    return {
      success: true,
      message: `Technician assigned to Installation ${data.installationNumber}.`,
      data,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateInstallationStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.installationsService.updateStatus(id, statusDto, userId);
    return {
      success: true,
      message: `Installation ${data.installationNumber} status updated to ${data.installationStatus}.`,
      data,
    };
  }

  @Patch(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteInstallationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.installationsService.complete(id, completeDto, userId);
    return {
      success: true,
      message: `Installation ${data.installationNumber} marked as Completed & Commissioned.`,
      data,
    };
  }

  @Post(':id/create-invoice')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.installationsService.createInvoice(id, userId);
    return {
      success: true,
      message: `Invoice ${data.invoiceNumber} created for Installation.`,
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return await this.installationsService.remove(id, userId);
  }
}
