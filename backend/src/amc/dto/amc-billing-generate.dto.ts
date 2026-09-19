import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class GenerateAmcBillingDto {
  @IsString()
  @IsNotEmpty()
  amcContractId: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  billingPeriodNumber?: number;

  @IsString()
  @IsOptional()
  billingScheduleId?: string;
}
