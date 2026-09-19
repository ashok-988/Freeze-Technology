import { IsOptional, IsString } from 'class-validator';

export class PurchaseOrderQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
