import {
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class RenewAmcDto {
  @IsDateString({}, { message: 'Start date must be a valid date string.' })
  @IsNotEmpty({ message: 'Start date is required.' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date string.' })
  @IsNotEmpty({ message: 'End date is required.' })
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
  @IsString()
  notes?: string;
}
