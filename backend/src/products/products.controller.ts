import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: ProductQueryDto) {
    const data = await this.productsService.findAll(query);
    return { success: true, data };
  }

  @Get('stats')
  async getStats() {
    const data = await this.productsService.getSummaryStats();
    return { success: true, data };
  }

  @Get('categories')
  async getCategories() {
    const data = await this.productsService.getCategories();
    return { success: true, data };
  }

  @Get('brands')
  async getBrands() {
    const data = await this.productsService.getBrands();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.productsService.findById(id);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto) {
    const data = await this.productsService.create(createProductDto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const data = await this.productsService.update(id, updateProductDto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.productsService.remove(id);
    return { success: true, ...result };
  }
}
