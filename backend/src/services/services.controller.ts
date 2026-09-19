import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateServiceStatusDto } from './dto/update-service-status.dto';
import { CompleteServiceDto } from './dto/complete-service.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll(@Query() query: ServiceQueryDto) {
    const data = await this.servicesService.findAll(query);
    return { success: true, data };
  }

  @Get('stats')
  async getStats() {
    const data = await this.servicesService.getStats();
    return { success: true, data };
  }

  @Get('technicians')
  async getTechnicians() {
    const data = await this.servicesService.getTechnicians();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.servicesService.findById(id);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createServiceDto: CreateServiceDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.servicesService.create(createServiceDto, userId);
    return {
      success: true,
      message: `Job Card ${data.jobNumber} created successfully.`,
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.servicesService.update(id, updateServiceDto, userId);
    return { success: true, data };
  }

  @Patch(':id/assign')
  async assignTechnician(
    @Param('id') id: string,
    @Body() assignDto: AssignTechnicianDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.servicesService.assignTechnician(id, assignDto, userId);
    return {
      success: true,
      message: `Technician ${data.technician?.fullName || ''} assigned to Job Card ${data.jobNumber}.`,
      data,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateServiceStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.servicesService.updateStatus(id, statusDto, userId);
    return {
      success: true,
      message: `Job Card ${data.jobNumber} status updated to ${data.status}.`,
      data,
    };
  }

  @Patch(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteServiceDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.servicesService.completeService(id, completeDto, userId);
    return {
      success: true,
      message: `Service Job Card ${data.jobNumber} has been completed.`,
      data,
    };
  }

  @Post(':id/create-invoice')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.servicesService.createInvoiceFromService(id, userId);
    return {
      success: true,
      message: `Invoice ${data.invoiceNumber} generated for Service Job.`,
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.servicesService.remove(id, userId);
    return { success: true, ...result };
  }
}
