import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DispenseItemPayloadDto {
  @IsString()
  @IsNotEmpty()
  prescriptionItemId!: string;

  @IsString()
  @IsNotEmpty()
  medicineBatchId!: string;

  @IsNumber()
  @IsNotEmpty()
  dispenseQuantity!: number;
}

export class DispenseMedicineDto {
  @IsString()
  @IsNotEmpty()
  prescriptionId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DispenseItemPayloadDto)
  items!: DispenseItemPayloadDto[];
}
