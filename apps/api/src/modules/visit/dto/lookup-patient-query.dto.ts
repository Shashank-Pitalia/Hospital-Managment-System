import { IsNotEmpty, IsString } from 'class-validator';

export class LookupPatientQueryDto {
  @IsString()
  @IsNotEmpty()
  uid!: string;
}
