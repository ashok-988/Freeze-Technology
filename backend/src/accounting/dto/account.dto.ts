import { IsNotEmpty, IsString, IsOptional, IsIn, IsBoolean, IsNumber } from 'class-validator';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  accountCode: string; // e.g. "1010"

  @IsNotEmpty()
  @IsString()
  accountName: string; // e.g. "Cash in Hand"

  @IsNotEmpty()
  @IsString()
  @IsIn(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])
  accountType: string;

  @IsNotEmpty()
  @IsString()
  accountGroup: string; // CASH, BANK, RECEIVABLES, INVENTORY, FIXED_ASSETS, etc.

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['DEBIT', 'CREDIT'])
  normalBalance?: string;

  @IsOptional()
  @IsBoolean()
  allowPosting?: boolean = true;

  @IsOptional()
  @IsNumber()
  openingBalance?: number = 0;

  @IsOptional()
  @IsString()
  openingBalanceDate?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountGroup?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPosting?: boolean;

  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @IsOptional()
  @IsString()
  openingBalanceDate?: string;
}

export class QueryAccountDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  isActive?: string;
}
