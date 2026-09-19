import { IsOptional, IsNumber, Min, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePayrollRecordDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  otherAllowance?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  advanceDeduction?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  loanDeduction?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  otherDeduction?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
