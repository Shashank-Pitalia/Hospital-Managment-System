import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { BenefitOutcome } from '@prisma/client';

export class CreateBenefitRuleDto {
  @IsString()
  @IsNotEmpty()
  employmentTypeId!: string;

  @IsString()
  @IsOptional()
  medicineCategory?: string;

  @IsEnum(BenefitOutcome)
  @IsNotEmpty()
  outcome!: BenefitOutcome;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
