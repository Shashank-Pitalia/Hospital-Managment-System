import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsUUID()
  @IsNotEmpty()
  postId!: string;

  @IsUUID()
  @IsNotEmpty()
  gradeId!: string;

  @IsUUID()
  @IsNotEmpty()
  employmentTypeId!: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
