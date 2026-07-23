import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GRNItemDto {
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @IsString()
  @IsNotEmpty()
  batchNumber!: string;

  @IsString()
  @IsNotEmpty()
  manufacturer!: string;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  manufacturingDate!: string;

  @IsString()
  @IsNotEmpty()
  expiryDate!: string;

  @IsNumber()
  @IsNotEmpty()
  purchasePrice!: number;

  @IsNumber()
  @IsNotEmpty()
  issuePrice!: number;

  @IsBoolean()
  @IsOptional()
  qualityCheckPass?: boolean;
}

export class CreateGRNDto {
  @IsString()
  @IsNotEmpty()
  purchaseOrderId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GRNItemDto)
  items!: GRNItemDto[];
}
