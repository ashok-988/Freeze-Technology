import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class AssignTechnicianDto {
  @IsString()
  @IsNotEmpty({ message: 'Technician ID or code is required.' })
  technicianId: string;

  @IsDateString({}, { message: 'Scheduled date must be a valid ISO date string.' })
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}
