import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceiveStockPoDto } from './dto/receive-stock-po.dto';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get('stats')
  async getStats() {
    return await this.poService.getStats();
  }

  @Get()
  async findAll(@Query() query: PurchaseOrderQueryDto) {
    return await this.poService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.poService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreatePurchaseOrderDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return await this.poService.create(dto, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return await this.poService.update(id, dto, userId);
  }

  @Patch(':id/submit')
  async submit(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return await this.poService.submit(id, userId);
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return await this.poService.approve(id, userId);
  }

  @Post(':id/receive')
  async receiveStock(
    @Param('id') id: string,
    @Body() dto: ReceiveStockPoDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return await this.poService.receiveStock(id, dto, userId);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return await this.poService.cancel(id, userId);
  }
}
