import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockTransferDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID or SKU is required.' })
  productId: string;

  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer.' })
  @Min(1, { message: 'Transfer quantity must be at least 1.' })
  quantity: number;

  @IsString()
  @IsNotEmpty({ message: 'Source warehouse is required.' })
  fromWarehouse: string;

  @IsString()
  @IsNotEmpty({ message: 'Destination warehouse is required.' })
  toWarehouse: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
