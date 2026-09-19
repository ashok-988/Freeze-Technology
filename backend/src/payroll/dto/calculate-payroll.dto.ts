import { IsOptional, IsInt, Min } from 'class-validator';

export class CalculatePayrollDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  standardWorkingDays?: number = 26;
}
