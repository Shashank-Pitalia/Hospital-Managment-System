import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  genericName!: string;

  @IsString()
  @IsOptional()
  brandName?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  strength!: string;

  @IsString()
  @IsNotEmpty()
  dosageForm!: string;
}
