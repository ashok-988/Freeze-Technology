import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateAmcDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer ID is required.' })
  customerId: string;

  @IsString()
  @IsNotEmpty({ message: 'Product / Equipment ID is required.' })
  productId: string;

  @IsDateString({}, { message: 'Start date must be a valid date string.' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date string.' })
  endDate: string;

  @IsOptional()
  @IsNumber({}, { message: 'Total visits must be a number.' })
  @Min(1, { message: 'Total visits must be at least 1.' })
  totalVisits?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Contract value must be a number.' })
  @Min(0, { message: 'Contract value cannot be negative.' })
  contractValue?: number;

  @IsOptional()
  @IsNumber()
  gstRate?: number;

  @IsOptional()
  @IsString()
  contractType?: string; // COMPREHENSIVE, NON_COMPREHENSIVE, PREVENTIVE, BREAKDOWN, CUSTOM

  @IsOptional()
  @IsString()
  serviceFrequency?: string; // MONTHLY, BI_MONTHLY, QUARTERLY, HALF_YEARLY, ANNUAL

  @IsOptional()
  @IsString()
  billingFrequency?: string; // MONTHLY, QUARTERLY, HALF_YEARLY, ANNUAL, CUSTOM

  @IsOptional()
  @IsString()
  assignedTechnicianId?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  coveredAssetIds?: string[];

  @IsOptional()
  assetIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

