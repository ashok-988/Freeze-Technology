import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { AssetsService } from './assets.service';
import { AssetsPdfService } from './assets-pdf.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';

@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetsPdfService: AssetsPdfService,
  ) {}

  @Get()
  async findAll(@Query() query: AssetQueryDto) {
    const data = await this.assetsService.findAll(query);
    return { success: true, ...data };
  }

  @Get('stats')
  async getStats() {
    const data = await this.assetsService.getStats();
    return { success: true, data };
  }

  @Get('warranty')
  async getWarrantyAnalysis() {
    const data = await this.assetsService.getWarrantyAnalysis();
    return { success: true, data };
  }

  @Get('export/register-pdf')
  async exportRegisterPdf(@Query() query: AssetQueryDto, @Res() res: Response) {
    const result = await this.assetsService.findAll({ ...query, limit: '200' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Asset-Register-${Date.now()}.pdf"`,
    );
    this.assetsPdfService.generateAssetRegisterPDF(result.items, res);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.assetsService.findById(id);
    return { success: true, data };
  }

  @Get(':id/pdf')
  async exportAssetCardPdf(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.assetsService.findById(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Asset-${asset.assetNumber}.pdf"`,
    );
    this.assetsPdfService.generateAssetCardPDF(asset, res);
  }

  @Post()
  async create(@Body() dto: CreateAssetDto, @Req() req: any) {
    const userId = req.user?.id || 'usr-admin-01';
    const data = await this.assetsService.create(dto, userId);
    return { success: true, data, message: 'Asset registered successfully.' };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'usr-admin-01';
    const data = await this.assetsService.update(id, dto, userId);
    return { success: true, data, message: 'Asset updated successfully.' };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'usr-admin-01';
    const data = await this.assetsService.delete(id, userId);
    return { success: true, data };
  }
}
