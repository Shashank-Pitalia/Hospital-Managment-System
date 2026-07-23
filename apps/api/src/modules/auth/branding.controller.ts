import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

let BRANDING_STORE = {
  hospitalName: 'ESIC Model Hospital & ODC',
  tagline: 'Chinta Se Mukti • Dedicated to Healthcare Excellence',
  primaryColor: '#005691',
  logoUrl: 'https://www.esic.gov.in/assets/images/logo.png',
  updatedAt: new Date().toISOString(),
};

@Controller(['branding', 'config/branding'])
export class BrandingController {
  @Get()
  @Public()
  async getBranding() {
    return BRANDING_STORE;
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @RequirePermission('BrandingConfig', 'update')
  async updateBranding(@Body() body: any, @Req() req: any) {
    BRANDING_STORE = {
      ...BRANDING_STORE,
      hospitalName: body.hospitalName || BRANDING_STORE.hospitalName,
      tagline: body.tagline || BRANDING_STORE.tagline,
      primaryColor: body.primaryColor || BRANDING_STORE.primaryColor,
      logoUrl: body.logoUrl || BRANDING_STORE.logoUrl,
      updatedAt: new Date().toISOString(),
    };

    return {
      status: 'success',
      message: 'Branding configuration updated successfully (FR-CFG-01 - FR-CFG-03)',
      data: BRANDING_STORE,
      updatedBy: req.user?.sub || 'superadmin-01',
    };
  }
}
