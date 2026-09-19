import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(150)
  productName: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  categoryId: string;

  @IsString()
  @IsNotEmpty({ message: 'Brand is required' })
  brandId: string;

  @IsString()
  @IsNotEmpty({ message: 'Model number/code is required' })
  @MaxLength(100)
  model: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  serialNumber?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  warrantyMonths?: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Purchase price is required' })
  @Min(0)
  @Type(() => Number)
  purchasePrice: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Selling price is required' })
  @Min(0)
  @Type(() => Number)
  sellingPrice: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  taxRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stockQuantity?: number;
}
