import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateAccountingPeriodDto {
  @IsNotEmpty()
  @IsString()
  financialYear: string; // e.g. "2026-27"

  @IsNotEmpty()
  @IsString()
  periodName: string; // e.g. "FY 2026-27 (Annual)"

  @IsNotEmpty()
  @IsString()
  startDate: string;

  @IsNotEmpty()
  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'CLOSED', 'LOCKED'])
  status?: string = 'OPEN';
}

export class ClosePeriodDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class QueryReportDto {
  @IsOptional()
  @IsString()
  financialYear?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  asOfDate?: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}
