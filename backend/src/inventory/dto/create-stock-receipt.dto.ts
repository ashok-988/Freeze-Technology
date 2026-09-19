import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockReceiptDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID or SKU is required.' })
  productId: string;

  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer.' })
  @Min(1, { message: 'Receipt quantity must be at least 1.' })
  quantity: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Unit cost must be a number.' })
  @IsPositive({ message: 'Unit cost must be greater than 0.' })
  @IsOptional()
  unitCost?: number;

  @IsString()
  @IsOptional()
  warehouseName?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
