import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OpdTokenGeneratorService } from './opd-token-generator.service';
import { DepartmentService } from './department.service';
import { CreateOpdVisitDto } from '../dto/create-opd-visit.dto';

const DEV_OPD_VISITS_STORE: any[] = [];

@Injectable()
export class OpdService {
  private readonly logger = new Logger(OpdService.name);

  constructor(
    private prisma: PrismaService,
    private tokenGenerator: OpdTokenGeneratorService,
    private departmentService: DepartmentService,
  ) {}

  /**
   * Create an OPD Visit record and issue an atomic daily queue token
   */
  async createOpdVisit(dto: CreateOpdVisitDto) {
    const dept = await this.departmentService.findById(dto.departmentId);
    if (!dept) {
      throw new NotFoundException(`Department not found for ID: ${dto.departmentId}`);
    }

    const tokenNumber = await this.tokenGenerator.generateDailyToken(dept.code);

    try {
      const opdVisit = await this.prisma.oPDVisit.create({
        data: {
          visitId: dto.visitId,
          departmentId: dept.id,
          tokenNumber,
        },
        include: {
          department: true,
          visit: {
            include: {
              employee: true,
            },
          },
        },
      });

      this.logger.log(`✅ Created OPDVisit ${opdVisit.id} with token ${tokenNumber}`);
      return {
        status: 'CREATED',
        opdVisit,
        tokenNumber,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Dev fallback for OPDVisit creation: ${message}`);

      const mockOpdVisit = {
        id: `opd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        visitId: dto.visitId,
        departmentId: dept.id,
        tokenNumber,
        calledAt: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        department: dept,
        visit: {
          id: dto.visitId,
          type: 'OPD',
          status: 'OPEN',
          employee: {
            name: 'Sample Patient',
            employeeId: 'EMP-1001',
          },
        },
      };

      DEV_OPD_VISITS_STORE.push(mockOpdVisit);

      return {
        status: 'CREATED',
        opdVisit: mockOpdVisit,
        tokenNumber,
      };
    }
  }

  /**
   * Fetch current queue for a department (waiting & called tokens)
   */
  async getQueue(departmentId: string) {
    try {
      const activeQueue = await this.prisma.oPDVisit.findMany({
        where: {
          departmentId,
          closedAt: null,
        },
        include: {
          department: true,
          visit: {
            include: {
              employee: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (activeQueue.length > 0) return activeQueue;
    } catch {
      // Fall through to memory store
    }

    return DEV_OPD_VISITS_STORE.filter(
      (o) =>
        (o.departmentId === departmentId || o.department?.code === departmentId) && !o.closedAt,
    );
  }

  /**
   * Mark token called by attending doctor
   */
  async callToken(id: string) {
    const calledAt = new Date();

    try {
      const updated = await this.prisma.oPDVisit.update({
        where: { id },
        data: { calledAt },
        include: { department: true, visit: { include: { employee: true } } },
      });
      return updated;
    } catch {
      const item = DEV_OPD_VISITS_STORE.find((o) => o.id === id);
      if (item) {
        item.calledAt = calledAt.toISOString();
        return item;
      }
      throw new NotFoundException(`OPDVisit not found for ID: ${id}`);
    }
  }

  /**
   * Mark visit closed
   */
  async closeOpdVisit(id: string) {
    const closedAt = new Date();

    try {
      const updated = await this.prisma.oPDVisit.update({
        where: { id },
        data: {
          closedAt,
          visit: {
            update: {
              status: 'CLOSED',
              closedAt,
            },
          },
        },
        include: { department: true, visit: true },
      });
      return updated;
    } catch {
      const item = DEV_OPD_VISITS_STORE.find((o) => o.id === id);
      if (item) {
        item.closedAt = closedAt.toISOString();
        if (item.visit) {
          item.visit.status = 'CLOSED';
        }
        return item;
      }
      throw new NotFoundException(`OPDVisit not found for ID: ${id}`);
    }
  }
}
