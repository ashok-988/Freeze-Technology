import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveStockItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Purchase Item ID is required.' })
  purchaseItemId: string;

  @IsNumber({}, { message: 'Received quantity must be a number.' })
  @Min(1, { message: 'Received quantity must be at least 1.' })
  receivedQuantity: number;
}

export class ReceiveStockPoDto {
  @IsArray({ message: 'Receive items must be an array.' })
  @ArrayMinSize(1, { message: 'At least one item must be received.' })
  @ValidateNested({ each: true })
  @Type(() => ReceiveStockItemDto)
  items: ReceiveStockItemDto[];

  @IsString()
  @IsOptional()
  warehouseName?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
