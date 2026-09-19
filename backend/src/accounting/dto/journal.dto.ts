import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class JournalLineDto {
  @IsNotEmpty()
  @IsString()
  accountId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  debit?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  credit?: number = 0;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;
}

export class CreateJournalEntryDto {
  @IsOptional()
  @IsString()
  entryDate?: string;

  @IsOptional()
  @IsString()
  accountingPeriodId?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'INVOICE',
    'PAYMENT',
    'VENDOR_BILL',
    'VENDOR_PAYMENT',
    'EXPENSE',
    'PAYROLL',
    'AMC_BILLING',
    'ASSET_ACQUISITION',
    'MANUAL',
    'REVERSAL',
  ])
  referenceType?: string = 'MANUAL';

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsNotEmpty()
  @IsString()
  narration: string;

  @IsOptional()
  @IsString()
  sourceModule?: string = 'MANUAL';

  @IsOptional()
  @IsString()
  sourceEntityId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'POSTED'])
  status?: string = 'POSTED';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}

export class ReverseJournalDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  reversalDate?: string;
}

export class QueryJournalDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string = '1';

  @IsOptional()
  @IsString()
  limit?: string = '50';
}
