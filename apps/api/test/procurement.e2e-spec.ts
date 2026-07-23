import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Procurement Module (E2E - Phase 12 Supply Chain)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdRequisitionId: string;
  let createdPOId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Authenticate Admin/Manager
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      identifier: 'superadmin@esic.gov.in',
      password: 'SuperAdminSecret123!',
    });

    authToken = loginRes.body.accessToken || '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. POST /api/procurement/requisitions - Should create a Purchase Requisition', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/procurement/requisitions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ medicineId: 'med-paracetamol', quantity: 500 }],
        triggeredByAlert: false,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('PENDING');
    createdRequisitionId = res.body.id;
  });

  it('2. POST /api/procurement/purchase-orders - Should REJECT unapproved requisition (FR-SCM-03)', async () => {
    // Create another unapproved requisition
    const reqRes = await request(app.getHttpServer())
      .post('/api/procurement/requisitions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ medicineId: 'med-paracetamol', quantity: 200 }],
      });

    const unapprovedReqId = reqRes.body.id;

    await request(app.getHttpServer())
      .post('/api/procurement/purchase-orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        requisitionId: unapprovedReqId,
        supplierId: 'sup-01',
        items: [{ medicineId: 'med-paracetamol', quantity: 200, unitPrice: 10 }],
      })
      .expect(400); // Bad Request (FR-SCM-03 approval check)
  });

  it('3. POST /api/procurement/requisitions/:id/approve - Should approve requisition', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/procurement/requisitions/${createdRequisitionId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        decision: 'APPROVED',
        notes: 'Verified stock deficit',
      })
      .expect(201);

    expect(res.body.decision).toBe('APPROVED');
  });

  it('4. POST /api/procurement/purchase-orders - Should issue PO for APPROVED requisition', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/procurement/purchase-orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        requisitionId: createdRequisitionId,
        supplierId: 'sup-01',
        items: [{ medicineId: 'med-paracetamol', quantity: 500, unitPrice: 10 }],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('ISSUED');
    createdPOId = res.body.id;
  });

  it('5. POST /api/procurement/goods-receipt-notes - Should record GRN delivery & add Central Store stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/procurement/goods-receipt-notes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        purchaseOrderId: createdPOId,
        items: [
          {
            medicineId: 'med-paracetamol',
            batchNumber: 'GRN-E2E-2026-B1',
            manufacturer: 'Cipla',
            quantity: 500,
            manufacturingDate: '2026-01-01',
            expiryDate: '2028-06-30',
            purchasePrice: 10,
            issuePrice: 15,
            qualityCheckPass: true,
          },
        ],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
  });

  it('6. POST /api/procurement/transfers - Should execute StoreTransfer from Central Store to Pharmacy', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/procurement/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        medicineBatchId: 'batch-p-500-01',
        fromLocation: 'CENTRAL_STORE',
        toLocation: 'PHARMACY',
        quantity: 100,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
  });
});
