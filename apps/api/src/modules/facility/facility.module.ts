import { Module } from '@nestjs/common';
import { FacilityController } from './facility.controller';
import { FacilityEligibilityService } from './facility.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FacilityController],
  providers: [FacilityEligibilityService],
  exports: [FacilityEligibilityService],
})
export class FacilityModule {}
