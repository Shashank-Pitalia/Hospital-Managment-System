import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePrescriptionItemDto {
  @IsString()
  @IsNotEmpty()
  medicineName!: string;

  @IsString()
  @IsNotEmpty()
  dose!: string;

  @IsString()
  @IsNotEmpty()
  frequency!: string;

  @IsString()
  @IsNotEmpty()
  duration!: string;
}
