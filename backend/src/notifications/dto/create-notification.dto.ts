import { IsString, IsNotEmpty, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  @IsIn(['Info', 'Warning', 'Error', 'Success'])
  notificationType?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'SYSTEM',
    'SALES',
    'CUSTOMER',
    'INVENTORY',
    'PROCUREMENT',
    'PAYMENTS',
    'PAYABLES',
    'PAYROLL',
    'EMPLOYEE',
    'ATTENDANCE',
    'SERVICE',
    'AMC',
    'INSTALLATION',
    'ASSET',
    'PREVENTIVE_MAINTENANCE',
    'GST',
    'REPORTS',
  ])
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsString()
  sourceEntityId?: string;

  @IsOptional()
  @IsString()
  sourceReference?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  eventKey?: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}
