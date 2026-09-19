import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateInstallationDto {
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

  @IsBoolean()
  @IsOptional()
  customerVerified?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
