import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Expiry & FEFO Automation (e2e)', () => {
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

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'superadmin@esic.gov.in', password: 'SuperAdminSecret123!' });

    jwtToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/inventory/scan-expiry triggers daily automated expiry scan', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/scan-expiry')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(201);

    expect(res.body).toHaveProperty('quarantinedCount');
    expect(res.body).toHaveProperty('criticalCount');
    expect(res.body).toHaveProperty('earlyCount');
    expect(res.body).toHaveProperty('scannedAt');
  });

  it('GET /api/inventory/expiring?within=90 returns expiring batches', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/expiring?within=90')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/inventory/batches/:id/quarantine quarantines a batch', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/batches/batch-p-500-01/quarantine')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ reason: 'Preemptive quarantine' })
      .expect(201);

    expect(res.body.stockStatus).toBe('QUARANTINED');
  });

  it('POST /api/inventory/batches/:id/dispose executes approved disposal with audit log', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/batches/batch-p-500-01/dispose')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        disposalReason: 'Expired past safe threshold',
        notes: 'Bio-hazard destruction cert #9912',
      })
      .expect(201);

    expect(res.body.stockStatus).toBe('DISPOSED');
    expect(res.body.currentStock).toBe(0);
  });
});
