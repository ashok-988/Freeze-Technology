import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PartConsumptionItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsOptional()
  unitCost?: number;
}

export class CompletePmDto {
  @IsDateString()
  @IsOptional()
  completionDate?: string;

  @IsString()
  @IsOptional()
  actualStartTime?: string;

  @IsString()
  @IsOptional()
  actualEndTime?: string;

  @IsString()
  @IsOptional()
  checklist?: string;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsString()
  @IsNotEmpty()
  workPerformed: string;

  @IsString()
  @IsOptional()
  recommendations?: string;

  @IsString()
  @IsOptional()
  customerAcknowledgement?: string;

  @IsString()
  @IsOptional()
  technicianRemarks?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PartConsumptionItemDto)
  partsConsumed?: PartConsumptionItemDto[];
}
