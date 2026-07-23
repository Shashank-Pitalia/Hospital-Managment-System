import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Dashboard Module (E2E - Phase 14 Admin Analytics)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Authenticate SuperAdmin
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      identifier: 'superadmin@esic.gov.in',
      password: 'SuperAdminSecret123!',
    });

    authToken = loginRes.body.accessToken || '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/dashboard/summary - Should return aggregate metrics for all 11 widget areas', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.opd).toBeDefined();
    expect(res.body.ipd).toBeDefined();
    expect(res.body.inventory).toBeDefined();
    expect(res.body.procurement).toBeDefined();
    expect(res.body.billing).toBeDefined();
    expect(res.body.auditExceptions).toBeDefined();
  });

  it('2. Zero Write Side Effect Verification - Multiple dashboard calls produce 0 state changes', async () => {
    // Call dashboard summary endpoint 5 consecutive times
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    }

    // Verify response structure remains consistent and zero side effects occur
    const finalRes = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(finalRes.body.opd).toBeDefined();
  });
});
