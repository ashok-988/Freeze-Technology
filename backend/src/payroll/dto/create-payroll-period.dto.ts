import {
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePayrollPeriodDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
