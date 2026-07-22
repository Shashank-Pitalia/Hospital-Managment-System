import { Controller, Put, Body } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('config/branding')
export class BrandingController {
  @Put()
  @RequirePermission('BrandingConfig', 'update')
  async updateBranding(@Body() body: Record<string, unknown>) {
    return { status: 'success', data: body };
  }
}
