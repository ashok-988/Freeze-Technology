import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateAmcPmDto {
  @IsString()
  @IsNotEmpty({ message: 'AMC Contract ID is required.' })
  amcContractId: string;
}
