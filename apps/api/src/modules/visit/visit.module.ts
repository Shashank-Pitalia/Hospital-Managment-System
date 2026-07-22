import { Module } from '@nestjs/common';
import { PatientLookupService } from './patient-lookup.service';
import { PatientLookupController } from './patient-lookup.controller';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';

@Module({
  controllers: [PatientLookupController, VisitController],
  providers: [PatientLookupService, VisitService],
  exports: [PatientLookupService, VisitService],
})
export class VisitModule {}
