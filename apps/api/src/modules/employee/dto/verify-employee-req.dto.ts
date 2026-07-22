import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmployeeReqDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;
}
