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
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationQueryDto } from './dto/quotation-query.dto';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async findAll(@Query() query: QuotationQueryDto) {
    const data = await this.quotationsService.findAll(query);
    return { success: true, data };
  }

  @Get('stats')
  async getStats() {
    const data = await this.quotationsService.getStats();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.quotationsService.findById(id);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createQuotationDto: CreateQuotationDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.quotationsService.create(createQuotationDto, userId);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
  ) {
    const data = await this.quotationsService.update(id, updateQuotationDto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.quotationsService.remove(id);
    return { success: true, ...result };
  }

  @Post(':id/convert-to-invoice')
  @HttpCode(HttpStatus.CREATED)
  async convertToInvoice(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.quotationsService.convertToInvoice(id, userId);
    return {
      success: true,
      message: `Quotation successfully converted to Invoice ${data.invoiceNumber}.`,
      data,
    };
  }
}
