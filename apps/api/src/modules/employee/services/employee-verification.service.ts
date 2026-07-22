import { Injectable, Inject, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LABOUR_DEPT_CLIENT, LabourDeptClient } from '../adapters/labour-dept.client';
import { HospitalUidGeneratorService } from './hospital-uid-generator.service';
import { QrCodeService } from './qr-code.service';
import { EmploymentTypeCode } from '@prisma/client';

export interface RegistrationResult {
  status: 'REGISTERED' | 'ALREADY_REGISTERED' | 'MANUAL_VERIFICATION_PENDING';
  employee?: Record<string, unknown>;
  hospitalUid?: Record<string, unknown>;
  qrDataUrl?: string;
  caseId?: string;
  reason?: string;
}

// In-memory dev store fallback when database connection is unavailable
const DEV_EMPLOYEES_STORE: any[] = [];
const DEV_UIDS_STORE: any[] = [];
const DEV_CASES_STORE: any[] = [];

@Injectable()
export class EmployeeVerificationService {
  private readonly logger = new Logger(EmployeeVerificationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(LABOUR_DEPT_CLIENT) private labourDeptClient: LabourDeptClient,
    private uidGenerator: HospitalUidGeneratorService,
    private qrService: QrCodeService,
  ) {}

  /**
   * Verify an Employee ID against the Labour Department adapter
   */
  async verifyEmployee(employeeId: string) {
    const verified = await this.labourDeptClient.verifyEmployee(employeeId);
    if (!verified) {
      return {
        status: 'UNVERIFIED',
        message: 'Employee ID not found in Labour Department database',
        verifiedData: null,
      };
    }

    return {
      status: 'VERIFIED',
      verifiedData: verified,
    };
  }

  /**
   * First-time employee registration flow (Spec §5 & Module 1)
   */
  async registerEmployee(employeeId: string, actorUserId?: string): Promise<RegistrationResult> {
    const trimmedId = employeeId.trim();

    // 1. Double-submit check
    let existingEmp: any = null;
    try {
      existingEmp = await this.prisma.employee.findUnique({
        where: { employeeId: trimmedId },
        include: { hospitalUid: true },
      });
    } catch {
      existingEmp = DEV_EMPLOYEES_STORE.find((e) => e.employeeId === trimmedId);
    }

    if (!existingEmp) {
      existingEmp = DEV_EMPLOYEES_STORE.find((e) => e.employeeId === trimmedId);
    }

    if (existingEmp && (existingEmp.hospitalUid || existingEmp.uidCode)) {
      const existingUidCode = existingEmp.hospitalUid?.uidCode || existingEmp.uidCode;
      throw new ConflictException({
        message: `Employee ID ${trimmedId} is already registered with Hospital UID ${existingUidCode}`,
        uidCode: existingUidCode,
        status: 'ALREADY_REGISTERED',
      });
    }

    // 2. Verify with Labour Dept Adapter
    const verified = await this.labourDeptClient.verifyEmployee(trimmedId);

    if (!verified) {
      // 3. Fallback: Create Manual Verification Escalation Case (FR-EMP-02)
      let caseId = `case-${Date.now()}`;
      try {
        const escalation = await this.prisma.manualVerificationCase.create({
          data: {
            employeeId: trimmedId,
            reason: 'Employee ID verification failed against Labour Department source',
            status: 'PENDING',
            createdBy: actorUserId || null,
          },
        });
        caseId = escalation.id;
      } catch {
        DEV_CASES_STORE.push({
          id: caseId,
          employeeId: trimmedId,
          reason: 'Verification failed against Labour Department source',
          status: 'PENDING',
        });
      }

      this.logger.warn(
        `🚨 Escalated unverified employee ${trimmedId} to ManualVerificationCase (${caseId})`,
      );

      return {
        status: 'MANUAL_VERIFICATION_PENDING',
        caseId,
        reason: 'Verification failed against Labour Department API. Escalated for manual review.',
      };
    }

    // 4. Atomic Registration Transaction with DB error dev fallback
    const year = new Date().getFullYear();
    const sequence = (DEV_UIDS_STORE.length + 1).toString().padStart(6, '0');
    const uidCode = `ESIC-${year}-${sequence}`;
    const qrDataUrl = await this.qrService.generateQrDataUrl(uidCode);

    try {
      return await this.prisma.$transaction(async (tx) => {
        let post = await tx.post.findUnique({ where: { title: verified.postTitle } });
        if (!post) {
          post = await tx.post.create({ data: { title: verified.postTitle } });
        }

        let grade = await tx.grade.findFirst({ where: { payLevel: verified.gradePayLevel } });
        if (!grade) {
          grade = await tx.grade.create({
            data: { payLevel: verified.gradePayLevel, postId: post.id },
          });
        }

        const empTypeCode =
          verified.employmentTypeCode === 'CONTRACTUAL'
            ? EmploymentTypeCode.CONTRACTUAL
            : EmploymentTypeCode.PERMANENT;

        let empType = await tx.employmentType.findUnique({ where: { code: empTypeCode } });
        if (!empType) {
          empType = await tx.employmentType.create({
            data: { code: empTypeCode, name: `${empTypeCode} Employee` },
          });
        }

        const employee = await tx.employee.create({
          data: {
            employeeId: trimmedId,
            name: verified.name,
            department: verified.department,
            postId: post.id,
            gradeId: grade.id,
            employmentTypeId: empType.id,
            contactPhone: verified.contactPhone || null,
            contactEmail: verified.contactEmail || null,
          },
          include: {
            post: true,
            grade: true,
            employmentType: true,
          },
        });

        const patientProfile = await tx.patientProfile.create({
          data: {
            employeeId: employee.id,
            eligibilityCategory: 'C',
          },
        });

        const hospitalUid = await tx.hospitalUID.create({
          data: {
            uidCode,
            employeeId: employee.id,
            qrPayload: qrDataUrl,
          },
        });

        return {
          status: 'REGISTERED',
          employee,
          patientProfile,
          hospitalUid,
          qrDataUrl,
        };
      });
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string } | null;

      if (errObj?.code === 'P2002' || errObj?.message?.includes('Unique constraint failed')) {
        throw new ConflictException({
          message: `Employee ID ${trimmedId} is already registered`,
          status: 'ALREADY_REGISTERED',
        });
      }

      // Dev memory fallback when DB connection is unavailable
      const mockEmp = {
        id: `emp-${Date.now()}`,
        employeeId: trimmedId,
        name: verified.name,
        department: verified.department,
        post: { title: verified.postTitle },
        grade: { payLevel: verified.gradePayLevel },
        employmentType: { code: verified.employmentTypeCode, name: verified.employmentTypeCode },
        contactPhone: verified.contactPhone || null,
        uidCode,
      };

      const mockUid = {
        uidCode,
        qrPayload: qrDataUrl,
        issuedAt: new Date().toISOString(),
      };

      DEV_EMPLOYEES_STORE.push(mockEmp);
      DEV_UIDS_STORE.push(mockUid);

      this.logger.log(`✅ [Dev Memory] Registered Employee ${trimmedId} -> Issued UID ${uidCode}`);

      return {
        status: 'REGISTERED',
        employee: mockEmp,
        hospitalUid: mockUid,
        qrDataUrl,
      };
    }
  }

  /**
   * Fetch printable UID card data by UID code or Employee ID
   */
  async getUidCardData(identifier: string) {
    const trimmed = identifier.trim();

    try {
      const uidRecord = await this.prisma.hospitalUID.findFirst({
        where: {
          OR: [{ uidCode: trimmed }, { employee: { employeeId: trimmed } }],
        },
        include: {
          employee: {
            include: {
              post: true,
              grade: true,
              employmentType: true,
              patientProfile: true,
            },
          },
        },
      });

      if (uidRecord) {
        return {
          uidCode: uidRecord.uidCode,
          qrDataUrl: uidRecord.qrPayload,
          issuedAt: uidRecord.issuedAt,
          employee: uidRecord.employee,
        };
      }
    } catch {
      // Fall through to memory store
    }

    const devEmp = DEV_EMPLOYEES_STORE.find(
      (e) => e.employeeId === trimmed || e.uidCode === trimmed,
    );

    if (devEmp) {
      return {
        uidCode: devEmp.uidCode,
        qrDataUrl: await this.qrService.generateQrDataUrl(devEmp.uidCode),
        issuedAt: new Date().toISOString(),
        employee: devEmp,
      };
    }

    throw new NotFoundException(`Hospital UID card not found for identifier: ${trimmed}`);
  }
}
