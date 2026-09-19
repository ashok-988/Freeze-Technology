import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class UpdateAttendanceDto {
  @IsString()
  @IsOptional()
  @IsIn([
    'Present',
    'Absent',
    'Half Day',
    'Leave',
    'Holiday',
    'Week Off',
    'Late',
    'On Duty',
  ])
  attendanceStatus?: string;

  @IsDateString()
  @IsOptional()
  checkIn?: string;

  @IsDateString()
  @IsOptional()
  checkOut?: string;

  @IsString()
  @IsOptional()
  leaveReason?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
