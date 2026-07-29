import { Controller, Get } from '@nestjs/common';
import { DepartmentService } from '../services/department.service';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @RequirePermission('Employee', 'read')
  async findAll() {
    return this.departmentService.findAll();
  }
}
