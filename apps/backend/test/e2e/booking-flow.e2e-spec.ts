import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Role, BookingStatus } from '@court-booking/shared';
import { DataSource } from 'typeorm';

describe('Booking Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let courtId: string;
  let bookingId: string;
  let sportTypeId: string;

  const testEmail = `user_flow_${Date.now()}@example.com`;
  const adminEmail = `admin_flow_${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get(DataSource);

    // 1. Setup Admin to create a court
    await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'Admin Flow',
      email: adminEmail,
      password,
    });
    await dataSource.query(`UPDATE users SET role = '${Role.ADMIN}' WHERE email = $1`, [
      adminEmail,
    ]);
    const adminLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: adminEmail,
      password,
    });
    adminToken = adminLogin.body.access_token;
    const [firstSportType] = await dataSource.query(
      'SELECT id FROM sport_types WHERE is_active = true ORDER BY display_order ASC, created_at ASC LIMIT 1',
    );
    sportTypeId = firstSportType?.id;

    const courtRes = await request(app.getHttpServer())
      .post('/api/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sân Flow Test',
        sportTypeId,
        courtType: 'INDOOR',
        address: 'Flow Address',
        pricePerHour: 100000,
      });
    courtId = courtRes.body.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup
    if (dataSource) {
      if (bookingId) await dataSource.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
      if (courtId) await dataSource.query('DELETE FROM courts WHERE id = $1', [courtId]);
      await dataSource.query(
        "DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_flow_%')",
      );
      await dataSource.query("DELETE FROM users WHERE email LIKE '%_flow_%'");
    }
    if (app) {
      const redis = app.get('REDIS_CLIENT');
      if (redis) await redis.quit();
      await app.close();
    }
  });

  describe('Full Booking Lifecycle (S4-06)', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/register').send({
        name: 'User Flow',
        email: testEmail,
        password,
      });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe(testEmail);
      userId = res.body.id;
    });

    it('should login and get token', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: testEmail,
        password,
      });
      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      userToken = res.body.access_token;
    });

    it('should view court schedule', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app.getHttpServer())
        .get(`/api/courts/${courtId}/schedule`)
        .query({ date: today });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should create a booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      const startTime = tomorrow.toISOString();
      tomorrow.setHours(16, 0, 0, 0);
      const endTime = tomorrow.toISOString();

      const res = await request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          courtId,
          startTime,
          endTime,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe(BookingStatus.CONFIRMED);
      bookingId = res.body.id;
    });

    it('should see booking in history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bookings/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((b: any) => b.id === bookingId)).toBe(true);
    });

    it('should cancel the booking', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(BookingStatus.CANCELLED);
    });

    it('should verify cancellation in history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bookings/me')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ status: BookingStatus.CANCELLED });

      expect(res.status).toBe(200);
      const cancelledBooking = res.body.data.find((b: any) => b.id === bookingId);
      expect(cancelledBooking).toBeDefined();
      expect(cancelledBooking.status).toBe(BookingStatus.CANCELLED);
    });
  });
});
