import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Billing Module (E2E - Phase 13 Billing & Benefit Ledger)', () => {
  let app: INestApplication;
  let authToken: string;
  let transactionId: string;

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

  it('1. GET /api/billing/transactions - Should return billing transactions ledger', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/billing/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    transactionId = res.body[0].id;
  });

  it('2. GET /api/billing/receipts/:id - Should return formatted receipt summary data', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/billing/receipts/${transactionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.transactionId).toBeDefined();
    expect(res.body.receiptReference).toBeDefined();
    expect(res.body.status).toBe('PAID & ISSUED');
  });
});
