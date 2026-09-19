import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateInstallationDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer ID is required.' })
  customerId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsString()
  @IsOptional()
  technicianId?: string;

  @IsDateString({}, { message: 'Installation date must be a valid ISO date string.' })
  @IsOptional()
  installationDate?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Pending', 'Assigned', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'], {
    message: 'Invalid installation status.',
  })
  installationStatus?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
