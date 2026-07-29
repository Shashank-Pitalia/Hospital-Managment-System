import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { OpdService } from '../services/opd.service';
import { CreateOpdVisitDto } from '../dto/create-opd-visit.dto';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';

@Controller('opd-visits')
export class OpdController {
  constructor(private readonly opdService: OpdService) {}

  @Post()
  @RequirePermission('Employee', 'read')
  async createOpdVisit(@Body() createOpdVisitDto: CreateOpdVisitDto) {
    return this.opdService.createOpdVisit(createOpdVisitDto);
  }

  @Get('queue')
  @RequirePermission('Employee', 'read')
  async getQueue(@Query('departmentId') departmentId: string) {
    return this.opdService.getQueue(departmentId);
  }

  @Post(':id/call')
  @RequirePermission('Employee', 'read')
  async callToken(@Param('id') id: string) {
    return this.opdService.callToken(id);
  }

  @Post(':id/close')
  @RequirePermission('Employee', 'read')
  async closeOpdVisit(@Param('id') id: string) {
    return this.opdService.closeOpdVisit(id);
  }
}
