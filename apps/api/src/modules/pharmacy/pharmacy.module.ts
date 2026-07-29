import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { BenefitModule } from '../benefit/benefit.module';

@Module({
  imports: [BenefitModule],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
