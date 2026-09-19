import { IsOptional, IsString } from 'class-validator';

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  range?: string; // 'today' | 'yesterday' | 'this_week' | 'this_month' | 'prev_month' | 'this_quarter' | 'prev_quarter' | 'this_fy' | 'prev_fy' | 'custom'

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  groupBy?: string; // 'day' | 'month' | 'customer' | 'category' | 'status'

  @IsOptional()
  page?: string | number;

  @IsOptional()
  limit?: string | number;
}
