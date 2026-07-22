import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterEmployeeReqDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;
}
