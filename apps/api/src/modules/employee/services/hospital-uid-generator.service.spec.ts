import { Test, TestingModule } from '@nestjs/testing';
import { HospitalUidGeneratorService } from './hospital-uid-generator.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('HospitalUidGeneratorService', () => {
  let service: HospitalUidGeneratorService;

  const mockPrismaService = {
    hospitalUID: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalUidGeneratorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HospitalUidGeneratorService>(HospitalUidGeneratorService);
    jest.clearAllMocks();
  });

  it('should generate UID formatted as ESIC-YYYY-000001 for first issuance of the year', async () => {
    mockPrismaService.hospitalUID.count.mockResolvedValue(0);

    const year = new Date().getFullYear();
    const uid = await service.generateUid();

    expect(uid).toBe(`ESIC-${year}-000001`);
  });

  it('should increment sequence number correctly', async () => {
    mockPrismaService.hospitalUID.count.mockResolvedValue(42);

    const year = new Date().getFullYear();
    const uid = await service.generateUid();

    expect(uid).toBe(`ESIC-${year}-000043`);
  });
});
