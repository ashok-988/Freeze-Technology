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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async findAll(@Query() query: PaymentQueryDto) {
    const data = await this.paymentsService.findAll(query);
    return { success: true, data };
  }

  @Get('stats')
  async getStats() {
    const data = await this.paymentsService.getStats();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.paymentsService.findById(id);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.paymentsService.create(createPaymentDto, userId);
    return {
      success: true,
      message: `Payment of ₹${data.amount.toLocaleString('en-IN')} recorded successfully.`,
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.paymentsService.update(id, updatePaymentDto, userId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.paymentsService.remove(id, userId);
    return { success: true, ...result };
  }
}
