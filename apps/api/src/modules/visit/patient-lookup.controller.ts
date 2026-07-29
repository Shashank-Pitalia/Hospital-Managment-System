import { Controller, Get, Query } from '@nestjs/common';
import { PatientLookupService } from './patient-lookup.service';
import { LookupPatientQueryDto } from './dto/lookup-patient-query.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('patients')
export class PatientLookupController {
  constructor(private readonly lookupService: PatientLookupService) {}

  @Get('lookup')
  @RequirePermission('Employee', 'read')
  async lookupByUid(@Query() query: LookupPatientQueryDto) {
    return this.lookupService.lookupByUid(query.uid);
  }
}
