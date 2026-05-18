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
  let createdSportTypeId: string | undefined;

  const testEmail = `user_flow_${Date.now()}@example.com`;
  const adminEmail = `admin_flow_${Date.now()}@example.com`;
  const password = 'Password123!';
  const BUSINESS_TIMEZONE_OFFSET = '+07:00';

  const formatBusinessTime = (date: Date, hour: number) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;

    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${String(hour).padStart(2, '0')}:00:00${BUSINESS_TIMEZONE_OFFSET}`;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    dataSource = app.get(DataSource);
    const [firstSportType] = await dataSource.query(
      'SELECT id FROM sport_types WHERE is_active = true ORDER BY display_order ASC, created_at ASC LIMIT 1',
    );
    if (firstSportType?.id) {
      sportTypeId = firstSportType.id;
    } else {
      const [insertedSportType] = await dataSource.query(
        `
          INSERT INTO sport_types (name, icon, color, is_active, display_order)
          VALUES ($1, $2, $3, true, 0)
          RETURNING id
        `,
        [`E2E Flow Sport ${Date.now()}`, 'TENNIS', '#2563EB'],
      );
      sportTypeId = insertedSportType.id;
      createdSportTypeId = insertedSportType.id;
    }

    // 1. Setup Admin to create a court
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      name: 'Admin Flow',
      email: adminEmail,
      password,
    });
    await dataSource.query(`UPDATE users SET role = '${Role.ADMIN}' WHERE email = $1`, [
      adminEmail,
    ]);
    const adminLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: adminEmail,
      password,
    });
    adminToken = adminLogin.body.access_token;

    const courtRes = await request(app.getHttpServer())
      .post('/api/v1/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Flow Test Court',
        sportTypeId,
        courtType: 'INDOOR',
        address: 'Flow Address',
        pricePerHour: 100000,
      });
    courtId = courtRes.body.id;

    await request(app.getHttpServer())
      .put(`/api/v1/courts/${courtId}/time-slots`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slots: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          startHour: 14,
          endHour: 16,
          price: 100000,
        })),
      })
      .expect(200);
  }, 30000);

  afterAll(async () => {
    // Cleanup
    if (dataSource) {
      if (bookingId) await dataSource.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
      if (courtId)
        await dataSource.query('DELETE FROM court_time_slots WHERE court_id = $1', [courtId]);
      if (courtId) await dataSource.query('DELETE FROM courts WHERE id = $1', [courtId]);
      if (createdSportTypeId) {
        await dataSource.query('DELETE FROM sport_types WHERE id = $1', [createdSportTypeId]);
      }
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
      const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        name: 'User Flow',
        email: testEmail,
        password,
      });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe(testEmail);
      userId = res.body.id;
    });

    it('should login and get token', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
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
        .get(`/api/v1/courts/${courtId}/schedule`)
        .query({ date: today });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should create a booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startTime = formatBusinessTime(tomorrow, 14);
      const endTime = formatBusinessTime(tomorrow, 16);

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          courtId,
          startTime,
          endTime,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe(BookingStatus.PENDING_PAYMENT);
      bookingId = res.body.id;
    });

    it('should see booking in history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((b: any) => b.id === bookingId)).toBe(true);
    });

    it('should cancel the booking', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(BookingStatus.CANCELLED);
    });

    it('should verify cancellation in history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/me')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ status: BookingStatus.CANCELLED });

      expect(res.status).toBe(200);
      const cancelledBooking = res.body.data.find((b: any) => b.id === bookingId);
      expect(cancelledBooking).toBeDefined();
      expect(cancelledBooking.status).toBe(BookingStatus.CANCELLED);
    });
  });
});
