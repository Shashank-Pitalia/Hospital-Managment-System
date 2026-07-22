import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitStatus } from '@prisma/client';

const DEV_VISITS_STORE: any[] = [];

@Injectable()
export class VisitService {
  private readonly logger = new Logger(VisitService.name);

  constructor(private prisma: PrismaService) {}

  async createVisit(dto: CreateVisitDto) {
    const trimmedId = dto.employeeId.trim();

    // 1. Resolve employee
    let employeeId = trimmedId;
    try {
      const emp = await this.prisma.employee.findFirst({
        where: {
          OR: [
            { id: trimmedId },
            { employeeId: trimmedId },
            { hospitalUid: { uidCode: trimmedId } },
          ],
        },
      });

      if (emp) {
        employeeId = emp.id;
      }
    } catch {
      // Offline fallback
    }

    // 2. Check for existing OPEN visit (Spec §5 Module 2)
    let openVisit: any = null;
    try {
      openVisit = await this.prisma.visit.findFirst({
        where: {
          employeeId,
          status: VisitStatus.OPEN,
        },
      });
    } catch {
      openVisit = DEV_VISITS_STORE.find(
        (v) => v.employeeId === employeeId && v.status === VisitStatus.OPEN,
      );
    }

    if (!openVisit) {
      openVisit = DEV_VISITS_STORE.find(
        (v) => v.employeeId === employeeId && v.status === VisitStatus.OPEN,
      );
    }

    // Warn (don't hard block) if an open visit already exists
    if (openVisit && !dto.ignoreOpenVisitWarning) {
      this.logger.warn(`⚠️ Open visit warning for Employee ${employeeId}`);
      return {
        status: 'OPEN_VISIT_WARNING',
        openVisit,
        message:
          'Employee already has an open active visit. Confirm if you wish to proceed with a second visit record.',
      };
    }

    // 3. Create Visit
    try {
      const visit = await this.prisma.visit.create({
        data: {
          employeeId,
          type: dto.type,
          status: VisitStatus.OPEN,
        },
      });

      this.logger.log(`✅ Created Visit ${visit.id} (${dto.type}) for Employee ${employeeId}`);
      return {
        status: 'CREATED',
        visit,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Dev fallback for visit creation: ${message}`);

      const mockVisit = {
        id: `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`,
        employeeId,
        type: dto.type,
        status: VisitStatus.OPEN,
        createdAt: new Date().toISOString(),
      };
      DEV_VISITS_STORE.push(mockVisit);

      return {
        status: 'CREATED',
        visit: mockVisit,
      };
    }
  }

  async findVisitsByEmployee(employeeId: string) {
    try {
      return await this.prisma.visit.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return DEV_VISITS_STORE.filter((v) => v.employeeId === employeeId);
    }
  }
}
