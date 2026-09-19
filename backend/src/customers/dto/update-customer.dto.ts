import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  companyName?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['Retail', 'Commercial'], { message: 'Customer type must be Retail or Commercial' })
  customerType?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9+ -]{10,15}$/, { message: 'Please provide a valid 10-digit mobile number' })
  mobile?: string;

  @IsString()
  @IsOptional()
  alternateMobile?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{6}$/, { message: 'Pincode must be a 6-digit number' })
  pincode?: string;
}
