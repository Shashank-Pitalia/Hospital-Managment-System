import { IsNotEmpty, IsString } from 'class-validator';

export class DischargeDto {
  @IsString()
  @IsNotEmpty()
  summaryText!: string;
}
