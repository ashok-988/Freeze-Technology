import { IsOptional, IsString } from 'class-validator';

export class AssetQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  modelNumber?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  amcStatus?: string;

  @IsOptional()
  @IsString()
  warrantyStatus?: string; // ACTIVE, EXPIRING_30, EXPIRING_60, EXPIRED, NONE

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
