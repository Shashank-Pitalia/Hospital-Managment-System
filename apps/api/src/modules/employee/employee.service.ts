import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { employeeId: createEmployeeDto.employeeId },
    });

    if (existing) {
      throw new ConflictException(
        `Employee with ID ${createEmployeeDto.employeeId} already exists`,
      );
    }

    return this.prisma.employee.create({
      data: createEmployeeDto,
      include: {
        post: true,
        grade: true,
        employmentType: true,
      },
    });
  }

  async findAll() {
    return this.prisma.employee.findMany({
      include: {
        post: true,
        grade: true,
        employmentType: true,
        hospitalUid: true,
      },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        post: true,
        grade: true,
        employmentType: true,
        hospitalUid: true,
        patientProfile: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(id: string, updateDto: Partial<CreateEmployeeDto>) {
    await this.findOne(id);

    return this.prisma.employee.update({
      where: { id },
      data: updateDto,
      include: {
        post: true,
        grade: true,
        employmentType: true,
      },
    });
  }
}
