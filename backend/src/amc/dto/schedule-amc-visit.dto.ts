import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class ScheduleAmcVisitDto {
  @IsDateString({}, { message: 'Scheduled date must be a valid date string.' })
  @IsNotEmpty({ message: 'Scheduled date is required.' })
  scheduledDate: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
