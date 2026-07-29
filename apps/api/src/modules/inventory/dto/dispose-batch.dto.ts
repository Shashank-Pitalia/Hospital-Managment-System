import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DisposeBatchDto {
  @IsString()
  @IsNotEmpty()
  disposalReason!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
