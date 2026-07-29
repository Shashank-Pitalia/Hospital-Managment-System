import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePrescriptionItemDto } from './create-prescription-item.dto';

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  visitId!: string;

  @IsString()
  @IsOptional()
  symptoms?: string;

  @IsString()
  @IsOptional()
  examinationNotes?: string;

  @IsString()
  @IsNotEmpty()
  diagnosisText!: string;

  @IsBoolean()
  @IsOptional()
  followUpFlag?: boolean;

  @IsBoolean()
  @IsOptional()
  admissionRecommended?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items: CreatePrescriptionItemDto[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labTests?: string[];
}
