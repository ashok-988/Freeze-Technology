import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreatePmDto {
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  amcContractId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['MONTHLY', 'BI_MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL'])
  frequency?: string;

  @IsDateString()
  @IsNotEmpty()
  plannedDate: string;

  @IsString()
  @IsOptional()
  technicianId?: string;

  @IsString()
  @IsOptional()
  checklist?: string; // JSON string or comma-separated list of items

  @IsString()
  @IsOptional()
  @IsIn(['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED'])
  status?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
