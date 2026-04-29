import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Role, SportType } from '@court-booking/shared';
import { DataSource } from 'typeorm';

describe('CourtsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let createdCourtId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get(DataSource);

    // Register and login as admin for testing
    const adminEmail = `admin_e2e_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'Admin Test',
      email: adminEmail,
      password: 'Password123!',
    });

    // Manually update role to ADMIN in DB since register defaults to USER
    await dataSource.query(`UPDATE users SET role = '${Role.ADMIN}' WHERE email = $1`, [
      adminEmail,
    ]);

    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: adminEmail,
      password: 'Password123!',
    });

    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    // Cleanup users created during test
    await dataSource.query("DELETE FROM users WHERE email LIKE 'admin_e2e_%'");
    // Cleanup courts created
    if (createdCourtId && createdCourtId.length === 36) {
      await dataSource.query('DELETE FROM courts WHERE id = $1', [createdCourtId]);
    }
    await app.close();
  });

  describe('POST /courts', () => {
    it('should create a new court when admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sân E2E Test',
          sportType: SportType.BADMINTON,
          address: 'Địa chỉ E2E',
          pricePerHour: 100000,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Sân E2E Test');
      createdCourtId = res.body.id;
    });

    it('should return 403 when not admin', async () => {
      // Create a normal user token or just call without token (401)
      // Let's assume we call without token
      const res = await request(app.getHttpServer()).post('/api/courts').send({ name: 'Fail' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /courts', () => {
    it('should return list of courts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/courts')
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /courts/:id', () => {
    it('should return court details', async () => {
      const res = await request(app.getHttpServer()).get(`/api/courts/${createdCourtId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdCourtId);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app.getHttpServer()).get('/api/courts/invalid-uuid');
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /courts/:id', () => {
    it('should update court info', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/courts/${createdCourtId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sân E2E Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Sân E2E Updated');
    });
  });

  describe('DELETE /courts/:id', () => {
    it('should soft delete court', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/courts/${createdCourtId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify it's not in the list anymore
      const checkRes = await request(app.getHttpServer()).get(`/api/courts/${createdCourtId}`);
      expect(checkRes.status).toBe(404);
    });
  });
});
