import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { FacilityCategory } from '@prisma/client';

export class CreateFacilityRuleDto {
  @IsString()
  @IsOptional()
  postId?: string;

  @IsString()
  @IsOptional()
  gradeId?: string;

  @IsEnum(FacilityCategory)
  @IsNotEmpty()
  category!: FacilityCategory;

  @IsString()
  @IsNotEmpty()
  wardEligibility!: string;

  @IsString()
  @IsNotEmpty()
  room!: string;

  @IsString()
  @IsNotEmpty()
  facilityLevel!: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
