import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CompleteInstallationDto {
  @IsDateString({}, { message: 'Completed date must be a valid ISO date string.' })
  @IsOptional()
  completedDate?: string;

  @IsBoolean()
  @IsOptional()
  customerVerified?: boolean;

  @IsString()
  @IsOptional()
  commissioningNotes?: string;

  @IsString()
  @IsOptional()
  technicianRemarks?: string;

  @IsNumber()
  @IsOptional()
  actualCost?: number;
}
