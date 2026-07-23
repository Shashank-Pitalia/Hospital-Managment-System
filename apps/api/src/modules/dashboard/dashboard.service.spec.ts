import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('DashboardService (Phase 14 — Admin Dashboard & Analytics)', () => {
  let service: DashboardService;

  const mockPrisma: any = {
    visit: { count: jest.fn().mockResolvedValue(142) },
    admission: { count: jest.fn().mockResolvedValue(28) },
    bed: { count: jest.fn().mockResolvedValue(50) },
    medicineBatch: { count: jest.fn().mockResolvedValue(4) },
    purchaseRequisition: { count: jest.fn().mockResolvedValue(2) },
    purchaseOrder: { count: jest.fn().mockResolvedValue(3) },
    billingTransaction: { count: jest.fn().mockResolvedValue(86) },
    auditLog: { count: jest.fn().mockResolvedValue(12) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getMetrics should return read-only aggregate metrics for all 11 widget areas', async () => {
    const res = await service.getMetrics();
    expect(res.opd).toBeDefined();
    expect(res.ipd).toBeDefined();
    expect(res.inventory).toBeDefined();
    expect(res.procurement).toBeDefined();
    expect(res.billing).toBeDefined();
    expect(res.auditExceptions).toBeDefined();

    expect(res.ipd.totalBeds).toBe(50);
    expect(res.billing.permanentUtilizationPct).toBe(65);
  });
});
