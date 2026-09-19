import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Invoice ID is required.' })
  invoiceId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsNumber({}, { message: 'Amount must be a valid number.' })
  @Min(0.01, { message: 'Payment amount must be greater than 0.' })
  amount: number;

  @IsString()
  @IsIn(['Cash', 'UPI', 'Card', 'Bank Transfer'], {
    message: 'Payment method must be one of: Cash, UPI, Card, Bank Transfer',
  })
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Payment date must be a valid date format.' })
  paymentDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
