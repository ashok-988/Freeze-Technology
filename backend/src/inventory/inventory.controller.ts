import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateStockReceiptDto } from './dto/create-stock-receipt.dto';
import { CreateStockIssueDto } from './dto/create-stock-issue.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll(@Query() query: InventoryQueryDto) {
    const data = await this.inventoryService.findAll(query);
    return {
      success: true,
      data,
    };
  }

  @Get('stats')
  async getStats() {
    const data = await this.inventoryService.getStats();
    return {
      success: true,
      data,
    };
  }

  @Get('transactions')
  async getTransactions(
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    const data = await this.inventoryService.getTransactions({
      productId,
      search,
      type,
    });
    return {
      success: true,
      data,
    };
  }

  @Get('low-stock')
  async getLowStock() {
    const data = await this.inventoryService.findAll({ status: 'LowStock' });
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.inventoryService.findById(id);
    return {
      success: true,
      data,
    };
  }

  @Post('receipts')
  @HttpCode(HttpStatus.CREATED)
  async createReceipt(@Body() receiptDto: CreateStockReceiptDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.inventoryService.createReceipt(receiptDto, userId);
    return {
      success: true,
      message: `Successfully received ${receiptDto.quantity} units of ${data.product.productName}. New Stock: ${data.resultingQuantity}.`,
      data,
    };
  }

  @Post('issues')
  @HttpCode(HttpStatus.CREATED)
  async createIssue(@Body() issueDto: CreateStockIssueDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.inventoryService.createIssue(issueDto, userId);
    return {
      success: true,
      message: `Successfully issued ${issueDto.quantity} units of ${data.product.productName}. Remaining Stock: ${data.resultingQuantity}.`,
      data,
    };
  }

  @Post('adjustments')
  @HttpCode(HttpStatus.CREATED)
  async createAdjustment(@Body() adjDto: CreateStockAdjustmentDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.inventoryService.createAdjustment(adjDto, userId);
    return {
      success: true,
      message: `Successfully adjusted stock for ${data.product.productName} to ${data.resultingQuantity} units.`,
      data,
    };
  }

  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  async createTransfer(@Body() transferDto: CreateStockTransferDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.inventoryService.createTransfer(transferDto, userId);
    return {
      success: true,
      message: data.message,
      data,
    };
  }
}
