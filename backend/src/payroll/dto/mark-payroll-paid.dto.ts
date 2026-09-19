import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class MarkPayrollPaidDto {
  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string; // Bank Transfer, Cheque, Cash, UPI

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
