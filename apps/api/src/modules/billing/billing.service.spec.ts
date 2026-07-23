import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BenefitOutcome } from '@prisma/client';

describe('BillingService (Phase 13 — Billing & Benefit Ledger)', () => {
  let service: BillingService;

  const mockPrisma: any = {
    billingTransaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BillingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAllTransactions should return billing ledger entries with patient and prescription details', async () => {
    mockPrisma.billingTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-01',
        outcome: BenefitOutcome.PAID,
        amount: 150.0,
        receiptReference: 'RCPT-2026-001',
        createdAt: new Date().toISOString(),
        prescriptionItem: {
          medicineName: 'Paracetamol 500mg',
        },
      },
    ]);

    const res = await service.findAllTransactions();
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('tx-01');
    expect(res[0].outcome).toBe(BenefitOutcome.PAID);
  });

  it('getReceipt should construct printable receipt structure', async () => {
    mockPrisma.billingTransaction.findUnique.mockResolvedValue({
      id: 'tx-01',
      outcome: BenefitOutcome.PAID,
      amount: 150.0,
      receiptReference: 'RCPT-2026-001',
      createdAt: new Date().toISOString(),
      prescriptionItem: {
        medicineName: 'Paracetamol 500mg',
        dose: '1 tab',
        frequency: 'TDS',
        duration: '5 days',
        prescription: {
          visit: {
            employee: {
              employeeId: 'EMP-9001',
              employmentType: { name: 'Contractual' },
              patientProfile: { fullName: 'Rajesh Kumar' },
            },
          },
        },
      },
    });

    const receipt = await service.getReceipt('tx-01');
    expect(receipt.receiptReference).toBe('RCPT-2026-001');
    expect(receipt.patientName).toBe('Rajesh Kumar');
    expect(receipt.amountCharged).toBe(150.0);
    expect(receipt.status).toBe('PAID & ISSUED');
  });
});
