import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  expenseDate?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0.01)
  subtotal: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0)
  taxAmount?: number = 0;

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
  status?: string = 'DRAFT'; // DRAFT, SUBMITTED
}
