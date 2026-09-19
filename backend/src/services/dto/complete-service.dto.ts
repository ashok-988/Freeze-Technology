import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CompleteServiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Work done description is required.' })
  workDone: string;

  @IsOptional()
  @IsString()
  sparePartsUsed?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Actual cost must be a number.' })
  @Min(0, { message: 'Actual cost cannot be negative.' })
  actualCost?: number;

  @IsOptional()
  @IsString()
  customerSignature?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
