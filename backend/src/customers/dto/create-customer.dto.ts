import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  @MaxLength(100)
  customerName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  companyName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Customer type is required' })
  @IsEnum(['Retail', 'Commercial'], { message: 'Customer type must be Retail or Commercial' })
  customerType: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^[0-9+ -]{10,15}$/, { message: 'Please provide a valid 10-digit mobile number' })
  mobile: string;

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
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsNotEmpty({ message: 'Pincode is required' })
  @Matches(/^[0-9]{6}$/, { message: 'Pincode must be a 6-digit number' })
  pincode: string;
}
