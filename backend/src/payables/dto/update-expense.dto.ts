import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0.01)
  subtotal?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
