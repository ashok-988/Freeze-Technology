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
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AMCService } from './amc.service';
import { AmcPdfService } from './amc-pdf.service';
import { CreateAmcDto } from './dto/create-amc.dto';
import { UpdateAmcDto } from './dto/update-amc.dto';
import { AmcQueryDto } from './dto/amc-query.dto';
import { ScheduleAmcVisitDto } from './dto/schedule-amc-visit.dto';
import { UpdateAmcStatusDto } from './dto/update-amc-status.dto';
import { RenewAmcDto } from './dto/renew-amc.dto';
import { GenerateAmcBillingDto } from './dto/amc-billing-generate.dto';

@Controller('amc')
export class AMCController {
  constructor(
    private readonly amcService: AMCService,
    private readonly amcPdfService: AmcPdfService,
  ) {}

  @Get()
  async findAll(@Query() query: AmcQueryDto) {
    const data = await this.amcService.findAll(query);
    return { success: true, data };
  }

  @Get('stats')
  async getStats() {
    const data = await this.amcService.getStats();
    return { success: true, data };
  }

  @Get('export/revenue-pdf')
  async exportRevenuePdf(@Query() query: AmcQueryDto, @Res() res: Response) {
    const contracts = await this.amcService.findAll(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="AMC-Revenue-Report-${Date.now()}.pdf"`,
    );
    this.amcPdfService.generateAmcRevenueReportPDF(contracts, res);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.amcService.findById(id);
    return { success: true, data };
  }

  @Get(':id/billing-schedules')
  async getBillingSchedules(@Param('id') id: string) {
    const data = await this.amcService.getBillingSchedules(id);
    return { success: true, data };
  }

  @Get(':id/pdf')
  async exportContractPdf(@Param('id') id: string, @Res() res: Response) {
    const contract = await this.amcService.findById(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="AMC-Contract-${contract.amcNumber}.pdf"`,
    );
    this.amcPdfService.generateAmcContractPDF(contract, res);
  }

  @Get(':id/renewal-pdf')
  async exportRenewalPdf(@Param('id') id: string, @Res() res: Response) {
    const contract = await this.amcService.findById(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="AMC-Renewal-${contract.amcNumber}.pdf"`,
    );
    this.amcPdfService.generateAmcRenewalPDF(contract, res);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAmcDto: CreateAmcDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.amcService.create(createAmcDto, userId);
    return {
      success: true,
      message: `AMC Contract ${data.amcNumber} created successfully.`,
      data,
    };
  }

  @Post('billing/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateBilling(@Body() dto: GenerateAmcBillingDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.amcService.generateBillingInvoice(dto, userId);
    return { ...data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAmcDto: UpdateAmcDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.amcService.update(id, updateAmcDto, userId);
    return { success: true, data };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateAmcStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.amcService.updateStatus(id, statusDto, userId);
    return {
      success: true,
      message: `AMC Contract ${data.amcNumber} status updated to ${data.status}.`,
      data,
    };
  }

  @Post(':id/visits')
  @HttpCode(HttpStatus.CREATED)
  async scheduleVisit(
    @Param('id') id: string,
    @Body() scheduleDto: ScheduleAmcVisitDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.amcService.scheduleVisit(id, scheduleDto, userId);
    return {
      success: true,
      message: `Maintenance visit scheduled for AMC Contract ${data.amcNumber}.`,
      data,
    };
  }

  @Patch(':id/visits/:visitId/complete')
  async completeVisit(
    @Param('id') id: string,
    @Param('visitId') visitId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.amcService.completeVisit(id, visitId, userId);
    return {
      success: true,
      message: `AMC Maintenance visit marked as completed.`,
      data,
    };
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.CREATED)
  async renew(
    @Param('id') id: string,
    @Body() renewDto: RenewAmcDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.amcService.renew(id, renewDto, userId);
    return {
      success: true,
      message: `AMC Contract renewed successfully as ${data.amcNumber}.`,
      data,
    };
  }

  @Post(':id/create-invoice')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.amcService.createInvoice(id, userId);
    return {
      success: true,
      message: `Invoice ${data.invoice.invoiceNumber} generated for AMC Contract.`,
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.amcService.remove(id, userId);
    return { success: true, ...result };
  }
}
