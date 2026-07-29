import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check()', () => {
    it('should return health status with required fields', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('number');
      expect(result.version).toBeDefined();
    });

    it('should return a valid ISO timestamp', () => {
      const result = controller.check();
      const parsed = new Date(result.timestamp);
      expect(parsed.toISOString()).toBe(result.timestamp);
    });

    it('should return non-negative uptime', () => {
      const result = controller.check();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
