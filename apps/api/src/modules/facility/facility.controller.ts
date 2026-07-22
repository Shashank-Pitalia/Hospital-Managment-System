import { Controller, Post, Body } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('facility-rules')
export class FacilityController {
  @Post()
  @RequirePermission('FacilityEligibilityRule', 'create')
  async createRule(@Body() body: Record<string, unknown>) {
    return { status: 'success', data: body };
  }
}
