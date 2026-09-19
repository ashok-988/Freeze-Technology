import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer ID is required.' })
  customerId: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Complaint description is required.' })
  complaintDescription: string;

  @IsOptional()
  @IsString()
  @IsIn(['Low', 'Medium', 'High', 'Critical'], {
    message: 'Priority must be one of: Low, Medium, High, Critical',
  })
  priority?: string;

  @IsOptional()
  @IsString()
  serviceType?: string; // Breakdown, Water Wash, General Service, Gas Charging, Installation Repair

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
  @IsString()
  notes?: string;
}
