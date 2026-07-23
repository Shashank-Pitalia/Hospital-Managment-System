import { Module } from '@nestjs/common';
import { AdmissionController } from './admission.controller';
import { AdmissionService } from './admission.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { FacilityModule } from '../facility/facility.module';

@Module({
  imports: [PrismaModule, FacilityModule],
  controllers: [AdmissionController],
  providers: [AdmissionService],
  exports: [AdmissionService],
})
export class AdmissionModule {}
