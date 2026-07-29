import { Test, TestingModule } from '@nestjs/testing';
import { ExpiryScannerService } from './expiry-scanner.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StockStatus } from '@prisma/client';

describe('ExpiryScannerService', () => {
  let service: ExpiryScannerService;

  const mockBatchesStore: any[] = [];

  const mockPrisma = {
    medicineBatch: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        const now = new Date();
        const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (where?.expiryDate?.lte && where?.expiryDate?.lte <= now) {
          // Expired query
          return mockBatchesStore.filter(
            (b) =>
              b.expiryDate <= now &&
              !['EXPIRED', 'QUARANTINED', 'DISPOSED'].includes(b.stockStatus),
          );
        }

        if (where?.expiryDate?.lte && where?.expiryDate?.lte <= day30) {
          // Critical Alert query
          return mockBatchesStore.filter(
            (b) =>
              b.expiryDate > now &&
              b.expiryDate <= day30 &&
              ['IN_STOCK', 'EARLY_WARNING'].includes(b.stockStatus),
          );
        }

        if (where?.expiryDate?.lte && where?.expiryDate?.lte <= day90) {
          // Early Warning query
          return mockBatchesStore.filter(
            (b) => b.expiryDate > day30 && b.expiryDate <= day90 && b.stockStatus === 'IN_STOCK',
          );
        }

        return [];
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const b = mockBatchesStore.find((x) => x.id === where?.id);
        if (b) Object.assign(b, data);
        return b;
      }),
    },
  };

  beforeEach(async () => {
    mockBatchesStore.length = 0;
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpiryScannerService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ExpiryScannerService>(ExpiryScannerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runDailyScan - Boundary Conditions & Idempotency', () => {
    it('transitions batches crossing 90d (EarlyWarning), 30d (CriticalAlert), and past expiry (Quarantined)', async () => {
      const now = Date.now();
      const day80 = new Date(now + 80 * 24 * 60 * 60 * 1000);
      const day20 = new Date(now + 20 * 24 * 60 * 60 * 1000);
      const pastExp = new Date(now - 2 * 24 * 60 * 60 * 1000);

      mockBatchesStore.push(
        { id: 'b-90d', expiryDate: day80, stockStatus: StockStatus.IN_STOCK },
        { id: 'b-30d', expiryDate: day20, stockStatus: StockStatus.IN_STOCK },
        { id: 'b-past', expiryDate: pastExp, stockStatus: StockStatus.IN_STOCK },
      );

      const result = await service.runDailyScan();

      expect(result.earlyCount).toBe(1);
      expect(result.criticalCount).toBe(1);
      expect(result.quarantinedCount).toBe(1);

      expect(mockBatchesStore.find((b) => b.id === 'b-90d').stockStatus).toBe(
        StockStatus.EARLY_WARNING,
      );
      expect(mockBatchesStore.find((b) => b.id === 'b-30d').stockStatus).toBe(
        StockStatus.CRITICAL_ALERT,
      );
      expect(mockBatchesStore.find((b) => b.id === 'b-past').stockStatus).toBe(
        StockStatus.QUARANTINED,
      );
    });

    it('is strictly idempotent when executed twice on the same day', async () => {
      const now = Date.now();
      const day20 = new Date(now + 20 * 24 * 60 * 60 * 1000);

      mockBatchesStore.push({
        id: 'b-idem',
        expiryDate: day20,
        stockStatus: StockStatus.IN_STOCK,
      });

      // First run
      const res1 = await service.runDailyScan();
      expect(res1.criticalCount).toBe(1);
      expect(mockBatchesStore[0].stockStatus).toBe(StockStatus.CRITICAL_ALERT);

      // Second run (same day)
      const res2 = await service.runDailyScan();
      expect(res2.criticalCount).toBe(0);
      expect(res2.quarantinedCount).toBe(0);
      expect(res2.earlyCount).toBe(0);
      expect(mockBatchesStore[0].stockStatus).toBe(StockStatus.CRITICAL_ALERT);
    });
  });
});
