import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  productName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

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
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  purchasePrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  sellingPrice?: number;

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
