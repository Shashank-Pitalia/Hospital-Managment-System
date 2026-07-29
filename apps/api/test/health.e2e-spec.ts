import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

/**
 * Health endpoint E2E tests.
 *
 * Verifies the /api/health endpoint returns proper status information
 * from a fully bootstrapped NestJS application instance.
 */
describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('should return 200 and a valid health status payload', async () => {
      const response = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.version).toBeDefined();
    });
  });
});
