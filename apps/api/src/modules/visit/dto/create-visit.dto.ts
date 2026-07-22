import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { VisitType } from '@prisma/client';

export class CreateVisitDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsEnum(VisitType)
  @IsNotEmpty()
  type!: VisitType;

  @IsOptional()
  @IsBoolean()
  ignoreOpenVisitWarning?: boolean;
}
