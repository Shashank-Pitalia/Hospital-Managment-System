import { Module } from '@nestjs/common';
import { FacilityController } from './facility.controller';

@Module({
  controllers: [FacilityController],
})
export class FacilityModule {}
