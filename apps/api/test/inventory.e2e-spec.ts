import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('InventoryModule (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Login as SuperAdmin / StoreManager
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'superadmin@esic.gov.in', password: 'SuperAdminSecret123!' });

    jwtToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/inventory/medicines returns medicine master catalog with stock status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/medicines')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Verify stockStatus matches stored DB enum
    const firstMed = res.body[0];
    expect(firstMed).toHaveProperty('genericName');
    if (firstMed.batches && firstMed.batches.length > 0) {
      expect(firstMed.batches[0]).toHaveProperty('stockStatus');
      expect([
        'IN_STOCK',
        'EARLY_WARNING',
        'CRITICAL_ALERT',
        'EXPIRED',
        'QUARANTINED',
        'DISPOSED',
      ]).toContain(firstMed.batches[0].stockStatus);
    }
  });

  it('POST /api/inventory/medicines registers a new medicine master entry', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/medicines')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        genericName: `Amoxicillin-${Date.now()}`,
        brandName: 'Mox',
        category: 'Antibiotics',
        strength: '250mg',
        dosageForm: 'Capsule',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.category).toBe('Antibiotics');
  });

  it('GET /api/inventory/low-stock returns reorder alerts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/low-stock')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
