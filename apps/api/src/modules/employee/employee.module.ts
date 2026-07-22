import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { EmployeeVerificationService } from './services/employee-verification.service';
import { HospitalUidGeneratorService } from './services/hospital-uid-generator.service';
import { QrCodeService } from './services/qr-code.service';
import { LABOUR_DEPT_CLIENT, MockLabourDeptClient } from './adapters/labour-dept.client';

@Module({
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    EmployeeVerificationService,
    HospitalUidGeneratorService,
    QrCodeService,
    {
      provide: LABOUR_DEPT_CLIENT,
      useClass: MockLabourDeptClient,
    },
  ],
  exports: [
    EmployeeService,
    EmployeeVerificationService,
    HospitalUidGeneratorService,
    QrCodeService,
    LABOUR_DEPT_CLIENT,
  ],
})
export class EmployeeModule {}
