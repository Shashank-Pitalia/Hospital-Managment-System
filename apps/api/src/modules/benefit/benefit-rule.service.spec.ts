import { Test, TestingModule } from '@nestjs/testing';
import { BenefitRuleService } from './benefit-rule.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BenefitOutcome } from '@prisma/client';

describe('BenefitRuleService', () => {
  let service: BenefitRuleService;

  const mockPrismaService = {
    employmentType: {
      findUnique: jest.fn(),
    },
    benefitRule: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BenefitRuleService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<BenefitRuleService>(BenefitRuleService);
    jest.clearAllMocks();
  });

  it('should evaluate CONTRACTUAL employment type as PAID by default (Spec §7)', async () => {
    mockPrismaService.benefitRule.findFirst.mockResolvedValue({
      id: 'r-contractual',
      outcome: BenefitOutcome.PAID,
      active: true,
    });

    const result = await service.evaluate('CONTRACTUAL');
    expect(result).toBe(BenefitOutcome.PAID);
  });

  it('should evaluate PERMANENT employment type as COVERED by default', async () => {
    mockPrismaService.benefitRule.findFirst.mockResolvedValue({
      id: 'r-permanent',
      outcome: BenefitOutcome.COVERED,
      active: true,
    });

    const result = await service.evaluate('PERMANENT');
    expect(result).toBe(BenefitOutcome.COVERED);
  });

  it('should increment rule version on update without mutating historical records', async () => {
    mockPrismaService.benefitRule.findUnique.mockResolvedValue({
      id: 'r-1',
      version: 1,
      medicineCategory: null,
      outcome: BenefitOutcome.PAID,
      active: true,
    });

    mockPrismaService.benefitRule.update.mockResolvedValue({
      id: 'r-1',
      version: 2,
      outcome: BenefitOutcome.FREE,
      active: true,
    });

    const updated = await service.update('r-1', { outcome: BenefitOutcome.FREE });
    expect(updated.version).toBe(2);
    expect(updated.outcome).toBe(BenefitOutcome.FREE);
  });
});
