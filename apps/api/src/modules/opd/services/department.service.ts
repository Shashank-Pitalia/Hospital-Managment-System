import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export const SEED_DEPARTMENTS = [
  { name: 'Cardiology', code: 'CARDIO' },
  { name: 'Orthopedics', code: 'ORTHO' },
  { name: 'General Medicine', code: 'GENMED' },
  { name: 'Pediatrics', code: 'PEDIATRIC' },
  { name: 'Dermatology', code: 'DERMA' },
  { name: 'ENT (Ear, Nose, Throat)', code: 'ENT' },
];

const DEV_DEPARTMENTS_STORE: any[] = SEED_DEPARTMENTS.map((d, i) => ({
  id: `00000000-0000-0000-0000-${(i + 1).toString().padStart(12, '0')}`,
  name: d.name,
  code: d.code,
  createdAt: new Date().toISOString(),
}));

@Injectable()
export class DepartmentService implements OnModuleInit {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      for (const d of SEED_DEPARTMENTS) {
        const existing = await this.prisma.department.findUnique({ where: { code: d.code } });
        if (!existing) {
          await this.prisma.department.create({ data: d });
        }
      }
      this.logger.log('✅ Seeded default clinical departments');
    } catch {
      this.logger.log('Offline mode: Using pre-configured clinical departments store');
    }
  }

  async findAll() {
    try {
      const list = await this.prisma.department.findMany({
        orderBy: { name: 'asc' },
      });
      if (list.length > 0) return list;
    } catch {
      // Fall through to memory store
    }
    return DEV_DEPARTMENTS_STORE;
  }

  async findById(id: string) {
    try {
      const dept = await this.prisma.department.findUnique({ where: { id } });
      if (dept) return dept;
    } catch {
      // Fall through
    }
    return DEV_DEPARTMENTS_STORE.find((d) => d.id === id || d.code === id) || null;
  }
}
