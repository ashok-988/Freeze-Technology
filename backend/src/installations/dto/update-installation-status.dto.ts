import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateInstallationStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Status is required.' })
  @IsIn(['Pending', 'Assigned', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'], {
    message: 'Invalid installation status.',
  })
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
