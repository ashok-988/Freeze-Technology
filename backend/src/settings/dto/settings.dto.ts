import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  subTitle?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsString()
  @IsOptional()
  brandAuth?: string;

  @IsString()
  @IsOptional()
  regdOffice?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  cell?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankBranch?: string;

  @IsString()
  @IsOptional()
  bankAccountNo?: string;

  @IsString()
  @IsOptional()
  ifscCode?: string;
}

export class UpdateSystemSettingDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AuditLogQueryDto {
  @IsString()
  @IsOptional()
  moduleName?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
