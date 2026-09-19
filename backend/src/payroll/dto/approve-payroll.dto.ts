import { IsOptional, IsString } from 'class-validator';

export class ApprovePayrollDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
