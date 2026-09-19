import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  IsIn,
} from 'class-validator';

export class UpdateAmcDto {
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date string.' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date string.' })
  endDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Total visits must be a number.' })
  @Min(1, { message: 'Total visits must be at least 1.' })
  totalVisits?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Active', 'Expiring Soon', 'Expired', 'Cancelled', 'Renewed'], {
    message: 'Status must be one of: Active, Expiring Soon, Expired, Cancelled, Renewed',
  })
  status?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Contract value must be a number.' })
  @Min(0, { message: 'Contract value cannot be negative.' })
  contractValue?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
