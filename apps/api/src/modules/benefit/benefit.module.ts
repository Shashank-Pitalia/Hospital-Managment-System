import { Module } from '@nestjs/common';
import { BenefitRuleService } from './benefit-rule.service';
import { BenefitController } from './benefit.controller';

@Module({
  controllers: [BenefitController],
  providers: [BenefitRuleService],
  exports: [BenefitRuleService],
})
export class BenefitModule {}
