import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UpdateAmcStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Status is required.' })
  @IsIn(['Active', 'Expiring Soon', 'Expired', 'Cancelled', 'Renewed'], {
    message: 'Status must be one of: Active, Expiring Soon, Expired, Cancelled, Renewed',
  })
  status: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
