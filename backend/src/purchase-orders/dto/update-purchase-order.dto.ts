import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseOrderItemDto } from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto {
  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsDateString({}, { message: 'Purchase date must be a valid date string.' })
  @IsOptional()
  purchaseDate?: string;

  @IsDateString({}, { message: 'Expected delivery date must be a valid date string.' })
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsArray({ message: 'Line items must be an array.' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}
