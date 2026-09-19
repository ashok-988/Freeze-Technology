import { IsOptional, IsString } from 'class-validator';

export class CustomerQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  type?: string;
}
