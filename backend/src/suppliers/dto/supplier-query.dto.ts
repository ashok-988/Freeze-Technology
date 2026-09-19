import { IsOptional, IsString } from 'class-validator';

export class SupplierQueryDto {
  @IsString()
  @IsOptional()
  search?: string;
}
