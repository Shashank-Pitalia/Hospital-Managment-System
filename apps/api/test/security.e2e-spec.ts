import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Security & Branding Module (E2E - Phase 15 Hardening)', () => {
  let app: INestApplication;
  let superadminToken: string;
  let doctorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Authenticate SuperAdmin
    const loginSuperAdmin = await request(app.getHttpServer()).post('/api/auth/login').send({
      identifier: 'superadmin@esic.gov.in',
      password: 'SuperAdminSecret123!',
    });
    superadminToken = loginSuperAdmin.body.accessToken || '';

    // Authenticate Doctor
    const loginDoctor = await request(app.getHttpServer()).post('/api/auth/login').send({
      identifier: 'doctor@esic.gov.in',
      password: 'DoctorPass123!',
    });
    doctorToken = loginDoctor.body.accessToken || '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Response Security Headers - Should carry HSTS, CSP, X-Frame-Options, X-Content-Type-Options headers (FR-SEC-09)', async () => {
    const res = await request(app.getHttpServer()).get('/api/branding').expect(200);

    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['content-security-policy']).toBe("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-csrf-token']).toBeDefined();
  });

  it('2. GET /api/branding - Public read of hospital branding config', async () => {
    const res = await request(app.getHttpServer()).get('/api/branding').expect(200);

    expect(res.body.hospitalName).toBeDefined();
    expect(res.body.tagline).toBeDefined();
  });

  it('3. PUT /api/branding - SuperAdmin CAN update branding config (FR-CFG-01)', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/branding')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        hospitalName: 'ESIC Model Hospital & ODC (Hardened)',
        tagline: 'Chinta Se Mukti • Cyber Security Certified',
      })
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.hospitalName).toContain('Hardened');
  });

  it('4. RBAC Cross-Role Restriction - Doctor CANNOT update branding config (Returns 403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .put('/api/branding')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        hospitalName: 'Hacked Hospital',
      })
      .expect(403); // Forbidden by RBAC Guard
  });
});
