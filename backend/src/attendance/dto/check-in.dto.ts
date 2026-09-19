import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  @IsOptional()
  attendanceDate?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
