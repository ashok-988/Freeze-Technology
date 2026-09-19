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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('stats')
  async getStats() {
    return await this.suppliersService.getStats();
  }

  @Get()
  async findAll(@Query() query: SupplierQueryDto) {
    return await this.suppliersService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.suppliersService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateSupplierDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return await this.suppliersService.create(dto, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return await this.suppliersService.update(id, dto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return await this.suppliersService.remove(id, userId);
  }
}
