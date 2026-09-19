import { IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  salesAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  inventoryAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  procurementAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  payablesAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  payrollAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  employeeAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  attendanceAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  serviceAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  amcAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  assetAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  pmAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  systemAlerts?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])
  minPriority?: string;
}
