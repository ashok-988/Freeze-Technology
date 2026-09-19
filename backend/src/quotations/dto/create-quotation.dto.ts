import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuotationItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required for each quotation item.' })
  productId: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1.' })
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Unit price cannot be negative.' })
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Discount cannot be negative.' })
  discount?: number;
}

export class CreateQuotationDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer ID is required.' })
  customerId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Expiry date must be a valid date format.' })
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Discount cannot be negative.' })
  discount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Draft', 'Sent', 'Approved', 'Rejected'], {
    message: 'Status must be one of: Draft, Sent, Approved, Rejected',
  })
  status?: string;

  @IsArray({ message: 'Quotation must include at least one item.' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];
}
