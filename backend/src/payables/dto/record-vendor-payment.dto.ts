import {
  IsNumber,
  Min,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RecordVendorPaymentDto {
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string; // Bank Transfer, UPI, Cheque, Cash, Card

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
