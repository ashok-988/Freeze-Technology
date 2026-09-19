import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class UpdatePmDto {
  @IsDateString()
  @IsOptional()
  plannedDate?: string;

  @IsString()
  @IsOptional()
  technicianId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED'])
  status?: string;

  @IsString()
  @IsOptional()
  checklist?: string;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsString()
  @IsOptional()
  workPerformed?: string;

  @IsString()
  @IsOptional()
  recommendations?: string;

  @IsString()
  @IsOptional()
  customerAcknowledgement?: string;

  @IsString()
  @IsOptional()
  technicianRemarks?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
