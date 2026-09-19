import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateVendorBillItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Transform(({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value))
  @IsNumber()
  @Min(1)
  quantity: number;

  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  taxRate?: number = 18;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  lineSubtotal?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  lineTotal?: number;
}

export class CreateVendorBillDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

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

  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string = 'DRAFT'; // DRAFT, SUBMITTED

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVendorBillItemDto)
  items: CreateVendorBillItemDto[];
}
