import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApprovalDecision } from '@prisma/client';

export class ApproveRequisitionDto {
  @IsEnum(ApprovalDecision)
  @IsNotEmpty()
  decision!: ApprovalDecision;

  @IsString()
  @IsOptional()
  notes?: string;
}
