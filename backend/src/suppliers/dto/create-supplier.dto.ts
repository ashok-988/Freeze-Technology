import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required.' })
  companyName: string;

  @IsString()
  @IsNotEmpty({ message: 'Contact person is required.' })
  contactPerson: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  phone: string;

  @IsEmail({}, { message: 'Invalid email address.' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required.' })
  address: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;
}
