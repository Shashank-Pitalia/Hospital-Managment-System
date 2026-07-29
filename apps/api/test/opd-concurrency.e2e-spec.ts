import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('OPD Daily Token Concurrency (e2e)', () => {
  let app: INestApplication;
  let receptionistToken: string;

  const rolesStore: any[] = [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Reception', isSystemRole: true },
  ];

  const permissionsStore: any[] = [
    {
      id: 'p1',
      roleId: '00000000-0000-0000-0000-000000000001',
      resource: 'Employee',
      action: 'read',
    },
    {
      id: 'p2',
      roleId: '00000000-0000-0000-0000-000000000001',
      resource: 'Visit',
      action: 'create',
    },
  ];

  const usersStore: any[] = [];
  const deptCardio = {
    id: '00000000-0000-0000-0000-000000000050',
    name: 'Cardiology',
    code: 'CARDIO',
  };

  const opdVisitsStore: any[] = [];

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    role: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        return rolesStore.find((r) => r.id === where?.id || r.name === where?.name) || null;
      }),
    },
    user: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        const user = usersStore.find(
          (u) => u.id === where?.id || u.identifier === where?.identifier,
        );
        if (!user) return null;
        const role = rolesStore.find((r) => r.id === user.roleId);
        const perms = permissionsStore.filter((p) => p.roleId === user.roleId);
        return { ...user, role: { ...role, permissions: perms } };
      }),
    },
    department: {
      findUnique: jest.fn().mockResolvedValue(deptCardio),
      findMany: jest.fn().mockResolvedValue([deptCardio]),
    },
    oPDVisit: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const item = {
          id: `opd-${Date.now()}-${Math.random()}`,
          ...data,
          department: deptCardio,
          createdAt: new Date(),
        };
        opdVisitsStore.push(item);
        return item;
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('ReceptionPass123!', 10);
    usersStore.push({
      id: '00000000-0000-0000-0000-000000000099',
      identifier: 'reception@esic.gov.in',
      passwordHash,
      roleId: '00000000-0000-0000-0000-000000000001',
      active: true,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'reception@esic.gov.in', password: 'ReceptionPass123!' })
      .expect(200);

    receptionistToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle 20 concurrent token-creation requests for the same department producing 20 unique, gapless token numbers', async () => {
    const CONCURRENCY_COUNT = 20;

    // Fire 20 parallel token creation requests simultaneously
    const requests = Array.from({ length: CONCURRENCY_COUNT }).map((_, index) =>
      request(app.getHttpServer())
        .post('/api/opd-visits')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          visitId: `00000000-0000-0000-0000-${(index + 1).toString().padStart(12, '0')}`,
          departmentId: deptCardio.id,
        }),
    );

    const responses = await Promise.all(requests);

    // 1. All 20 requests must succeed with HTTP 201 Created
    responses.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('CREATED');
      expect(res.body.tokenNumber).toBeDefined();
    });

    // 2. Collect all token numbers
    const tokens = responses.map((res) => res.body.tokenNumber);

    // 3. Assert all 20 tokens are strictly unique (no duplicates / collisions)
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(CONCURRENCY_COUNT);

    // 4. Assert token numbers form a gapless sequence from CARDIO-001 to CARDIO-020
    const expectedTokens = Array.from({ length: CONCURRENCY_COUNT }).map(
      (_, i) => `CARDIO-${(i + 1).toString().padStart(3, '0')}`,
    );

    expect(tokens.sort()).toEqual(expectedTokens.sort());
  });
});
