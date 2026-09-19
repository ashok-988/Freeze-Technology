import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockIssueDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID or SKU is required.' })
  productId: string;

  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer.' })
  @Min(1, { message: 'Issue quantity must be at least 1.' })
  quantity: number;

  @IsString()
  @IsNotEmpty({ message: 'Issue reason is required (e.g., Installation, Service, Sale).' })
  reason: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
