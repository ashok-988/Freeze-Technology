import { IsOptional, IsString } from 'class-validator';

export class PmQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  amcContractId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  status?: string; // SCHEDULED, ASSIGNED, IN_PROGRESS, COMPLETED, MISSED, CANCELLED

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  range?: string; // today, this_week, this_month, overdue, upcoming

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
