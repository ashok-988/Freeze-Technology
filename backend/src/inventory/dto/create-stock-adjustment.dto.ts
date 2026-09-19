import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockAdjustmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID or SKU is required.' })
  productId: string;

  @Type(() => Number)
  @IsInt({ message: 'New quantity must be an integer.' })
  @Min(0, { message: 'New stock quantity cannot be negative.' })
  newQuantity: number;

  @IsString()
  @IsNotEmpty({ message: 'Adjustment reason is required.' })
  reason: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
