import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class AssignTechnicianDto {
  @IsString()
  @IsNotEmpty({ message: 'Technician ID is required.' })
  technicianId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Visit date must be a valid date string.' })
  visitDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
