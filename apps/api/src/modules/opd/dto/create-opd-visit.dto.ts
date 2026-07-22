import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOpdVisitDto {
  @IsString()
  @IsNotEmpty()
  visitId!: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;
}
