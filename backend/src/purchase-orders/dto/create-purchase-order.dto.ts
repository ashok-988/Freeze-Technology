import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required for each line item.' })
  productId: string;

  @IsNumber({}, { message: 'Quantity must be a number.' })
  @Min(1, { message: 'Quantity must be at least 1.' })
  quantity: number;

  @IsNumber({}, { message: 'Unit price must be a number.' })
  @Min(0, { message: 'Unit price cannot be negative.' })
  unitPrice: number;

  @IsNumber({}, { message: 'Tax amount must be a number.' })
  @IsOptional()
  @Min(0, { message: 'Tax amount cannot be negative.' })
  taxAmount?: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Supplier ID is required.' })
  supplierId: string;

  @IsDateString({}, { message: 'Purchase date must be a valid date string.' })
  @IsOptional()
  purchaseDate?: string;

  @IsDateString({}, { message: 'Expected delivery date must be a valid date string.' })
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray({ message: 'Line items must be an array.' })
  @ArrayMinSize(1, { message: 'At least one line item is required.' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
