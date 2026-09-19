import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CreateVendorBillItemDto } from './create-vendor-bill.dto';

export class UpdateVendorBillDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  vendorInvoiceNumber?: string;

  @IsOptional()
  @IsString()
  vendorInvoiceDate?: string;

  @IsOptional()
  @IsString()
  billDate?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVendorBillItemDto)
  items?: CreateVendorBillItemDto[];
}
