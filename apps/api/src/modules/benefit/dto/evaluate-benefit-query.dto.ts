import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EvaluateBenefitQueryDto {
  @IsString()
  @IsNotEmpty()
  employmentType!: string;

  @IsString()
  @IsOptional()
  medicineCategory?: string;
}
