import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeVerificationService } from './employee-verification.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LABOUR_DEPT_CLIENT } from '../adapters/labour-dept.client';
import { HospitalUidGeneratorService } from './hospital-uid-generator.service';
import { QrCodeService } from './qr-code.service';

describe('EmployeeVerificationService', () => {
  let service: EmployeeVerificationService;

  const mockPrismaService = {
    employee: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    manualVerificationCase: {
      create: jest.fn(),
    },
    hospitalUID: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    patientProfile: {
      create: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    grade: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    employmentType: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrismaService)),
  };

  const mockLabourDeptClient = {
    verifyEmployee: jest.fn(),
  };

  const mockUidGenerator = {
    generateUid: jest.fn().mockResolvedValue('ESIC-2026-000001'),
  };

  const mockQrService = {
    generateQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,mock_qr_data'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeVerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LABOUR_DEPT_CLIENT, useValue: mockLabourDeptClient },
        { provide: HospitalUidGeneratorService, useValue: mockUidGenerator },
        { provide: QrCodeService, useValue: mockQrService },
      ],
    }).compile();

    service = module.get<EmployeeVerificationService>(EmployeeVerificationService);
    jest.clearAllMocks();
  });

  it('should create ManualVerificationCase if Labour Dept verification fails (FR-EMP-02)', async () => {
    mockPrismaService.employee.findUnique.mockResolvedValue(null);
    mockLabourDeptClient.verifyEmployee.mockResolvedValue(null);
    mockPrismaService.manualVerificationCase.create.mockResolvedValue({
      id: 'case-123',
      employeeId: 'EMP-UNVERIFIED',
      status: 'PENDING',
    });

    const result = await service.registerEmployee('EMP-UNVERIFIED');

    expect(result.status).toBe('MANUAL_VERIFICATION_PENDING');
    expect(result.caseId).toBe('case-123');
    expect(mockPrismaService.manualVerificationCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        employeeId: 'EMP-UNVERIFIED',
        status: 'PENDING',
      }),
    });
  });

  it('should perform atomic registration transaction when verification succeeds', async () => {
    mockPrismaService.employee.findUnique.mockResolvedValue(null);
    mockLabourDeptClient.verifyEmployee.mockResolvedValue({
      employeeId: 'EMP-1001',
      name: 'Rajesh Kumar',
      department: 'PWD',
      postTitle: 'Clerk',
      gradePayLevel: 'Pay Level 4',
      employmentTypeCode: 'PERMANENT',
    });

    mockPrismaService.post.findUnique.mockResolvedValue({ id: 'post-1', title: 'Clerk' });
    mockPrismaService.grade.findFirst.mockResolvedValue({ id: 'grade-1', payLevel: 'Pay Level 4' });
    mockPrismaService.employmentType.findUnique.mockResolvedValue({
      id: 'type-1',
      code: 'PERMANENT',
    });

    mockPrismaService.employee.create.mockResolvedValue({
      id: 'emp-1001-id',
      employeeId: 'EMP-1001',
      name: 'Rajesh Kumar',
    });

    mockPrismaService.hospitalUID.create.mockResolvedValue({
      id: 'uid-1',
      uidCode: 'ESIC-2026-000001',
      qrPayload: 'data:image/png;base64,mock_qr_data',
    });

    const result = await service.registerEmployee('EMP-1001');

    expect(result.status).toBe('REGISTERED');
    expect(result.hospitalUid?.uidCode).toBe('ESIC-2026-000001');
    expect(result.qrDataUrl).toBe('data:image/png;base64,mock_qr_data');
  });
});
