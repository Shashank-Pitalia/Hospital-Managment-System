import { Test, TestingModule } from '@nestjs/testing';
import { OpdTokenGeneratorService } from './opd-token-generator.service';

describe('OpdTokenGeneratorService', () => {
  let service: OpdTokenGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpdTokenGeneratorService],
    }).compile();

    service = module.get<OpdTokenGeneratorService>(OpdTokenGeneratorService);
  });

  it('should generate sequential tokens for the same department on the same day', async () => {
    const token1 = await service.generateDailyToken('CARDIO');
    const token2 = await service.generateDailyToken('CARDIO');
    const token3 = await service.generateDailyToken('CARDIO');

    expect(token1).toBe('CARDIO-001');
    expect(token2).toBe('CARDIO-002');
    expect(token3).toBe('CARDIO-003');
  });

  it('should maintain independent counters per department', async () => {
    const cardio1 = await service.generateDailyToken('CARDIO');
    const ortho1 = await service.generateDailyToken('ORTHO');

    expect(cardio1).toContain('CARDIO-');
    expect(ortho1).toBe('ORTHO-001');
  });
});
