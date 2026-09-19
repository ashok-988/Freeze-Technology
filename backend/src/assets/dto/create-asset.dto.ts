import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  installationId?: string;

  @IsString()
  @IsOptional()
  brandName?: string;

  @IsString()
  @IsOptional()
  modelNumber?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  capacitySpec?: string;

  @IsDateString()
  @IsOptional()
  installationDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyStartDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyEndDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  siteAddress?: string;

  @IsString()
  @IsOptional()
  floorArea?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'UNDER_SERVICE', 'BREAKDOWN', 'INACTIVE', 'REPLACED', 'SCRAPPED'])
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(['NONE', 'COVERED', 'EXPIRING_SOON', 'EXPIRED'])
  amcStatus?: string;

  @IsString()
  @IsOptional()
  technicianId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
