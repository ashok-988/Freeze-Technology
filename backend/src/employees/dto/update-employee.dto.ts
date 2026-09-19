import {
  IsString,
  IsOptional,
  IsEmail,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Full-Time', 'Part-Time', 'Contract', 'Intern'])
  employmentType?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  salary?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  monthlySalary?: number;

  @IsString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
