import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UpdateServiceStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Status is required.' })
  @IsIn(['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'], {
    message: 'Status must be one of: Pending, Assigned, In Progress, Completed, Cancelled',
  })
  status: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
