import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { PreventiveMaintenanceService } from './preventive-maintenance.service';
import { PmPdfService } from './pm-pdf.service';
import { CreatePmDto } from './dto/create-pm.dto';
import { UpdatePmDto } from './dto/update-pm.dto';
import { CompletePmDto } from './dto/complete-pm.dto';
import { PmQueryDto } from './dto/pm-query.dto';
import { GenerateAmcPmDto } from './dto/generate-amc-pm.dto';

@Controller('preventive-maintenance')
export class PreventiveMaintenanceController {
  constructor(
    private readonly pmService: PreventiveMaintenanceService,
    private readonly pmPdfService: PmPdfService,
  ) {}

  @Get()
  async findAll(@Query() query: PmQueryDto) {
    const data = await this.pmService.findAll(query);
    return { success: true, ...data };
  }

  @Get('stats')
  async getStats() {
    const data = await this.pmService.getStats();
    return { success: true, data };
  }

  @Get('export/pdf')
  async exportScheduleReport(@Query() query: PmQueryDto, @Res() res: Response) {
    const result = await this.pmService.findAll({ ...query, limit: '200' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="PM-Schedule-Report-${Date.now()}.pdf"`,
    );
    this.pmPdfService.generatePmScheduleReportPDF(result.items, res);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.pmService.findById(id);
    return { success: true, data };
  }

  @Get(':id/pdf')
  async exportVisitPdf(@Param('id') id: string, @Res() res: Response) {
    const pm = await this.pmService.findById(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="PM-Visit-${pm.pmNumber}.pdf"`,
    );
    this.pmPdfService.generatePmVisitPDF(pm, res);
  }

  @Post()
  async create(@Body() dto: CreatePmDto, @Req() req: any) {
    const userId = req.user?.id || 'usr-admin-01';
    const data = await this.pmService.create(dto, userId);
    return { success: true, data, message: 'Preventive maintenance visit scheduled successfully.' };
  }

  @Post('generate-amc-pm')
  async generateAmcPMVisits(@Body() dto: GenerateAmcPmDto, @Req() req: any) {
    const userId = req.user?.id || 'usr-admin-01';
    const data = await this.pmService.generateAmcPMVisits(dto.amcContractId, userId);
    return { success: true, ...data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePmDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'usr-admin-01';
    const data = await this.pmService.update(id, dto, userId);
    return { success: true, data, message: 'PM schedule updated successfully.' };
  }

  @Post(':id/complete')
  async completeVisit(
    @Param('id') id: string,
    @Body() dto: CompletePmDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'usr-admin-01';
    const data = await this.pmService.completeVisit(id, dto, userId);
    return { success: true, data, message: 'Maintenance visit completed successfully. Inventory updated.' };
  }
}
