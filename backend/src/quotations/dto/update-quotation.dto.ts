import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuotationItemDto } from './create-quotation.dto';

export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Expiry date must be a valid date format.' })
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Discount cannot be negative.' })
  discount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Draft', 'Sent', 'Approved', 'Rejected', 'Converted'], {
    message: 'Status must be one of: Draft, Sent, Approved, Rejected, Converted',
  })
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];
}
