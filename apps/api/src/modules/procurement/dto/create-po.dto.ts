import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class POItemDto {
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;

  @IsNumber()
  @IsNotEmpty()
  unitPrice!: number;
}

export class CreatePODto {
  @IsString()
  @IsNotEmpty()
  requisitionId!: string;

  @IsString()
  @IsNotEmpty()
  supplierId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POItemDto)
  items!: POItemDto[];
}
