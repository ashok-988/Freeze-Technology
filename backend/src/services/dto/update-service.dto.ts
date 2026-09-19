import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  IsIn,
} from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  complaintDescription?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Low', 'Medium', 'High', 'Critical'], {
    message: 'Priority must be one of: Low, Medium, High, Critical',
  })
  priority?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Visit date must be a valid date string.' })
  visitDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Estimated cost must be a number.' })
  @Min(0, { message: 'Estimated cost cannot be negative.' })
  estimatedCost?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Actual cost must be a number.' })
  @Min(0, { message: 'Actual cost cannot be negative.' })
  actualCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
