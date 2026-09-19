import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  designation: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Full-Time', 'Part-Time', 'Contract', 'Intern'])
  employmentType?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

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
