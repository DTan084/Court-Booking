import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { BookingStatus, Role } from '@court-booking/shared';
import { DataSource } from 'typeorm';

describe('Bookings Concurrency (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let user1Token: string;
  let user2Token: string;
  let courtId: string;
  let sportTypeId: string;
  let createdSportTypeId: string | undefined;
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
        [`E2E Concurrency Sport ${Date.now()}`, 'TENNIS', '#2563EB'],
      );
      sportTypeId = insertedSportType.id;
      createdSportTypeId = insertedSportType.id;
    }

    // 1. Create Admin
    const adminEmail = `admin_conc_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      name: 'Admin Conc',
      email: adminEmail,
      password: 'Password123!',
    });
    await dataSource.query(`UPDATE users SET role = '${Role.ADMIN}' WHERE email = $1`, [
      adminEmail,
    ]);
    const adminLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: adminEmail,
      password: 'Password123!',
    });
    adminToken = adminLogin.body.access_token;

    // 2. Create User 1
    const user1Email = `user1_conc_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      name: 'User1 Conc',
      email: user1Email,
      password: 'Password123!',
    });
    const user1Login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: user1Email,
      password: 'Password123!',
    });
    user1Token = user1Login.body.access_token;

    // 3. Create User 2
    const user2Email = `user2_conc_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      name: 'User2 Conc',
      email: user2Email,
      password: 'Password123!',
    });
    const user2Login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: user2Email,
      password: 'Password123!',
    });
    user2Token = user2Login.body.access_token;

    // 4. Create a Court
    const courtRes = await request(app.getHttpServer())
      .post('/api/v1/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Concurrency Test Court',
        sportTypeId,
        courtType: 'INDOOR',
        address: 'Conc Address',
        pricePerHour: 150000,
      });
    courtId = courtRes.body.id;

    await request(app.getHttpServer())
      .put(`/api/v1/courts/${courtId}/time-slots`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slots: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          startHour: 8,
          endHour: 10,
          price: 150000,
        })),
      })
      .expect(200);
  }, 30000);

  afterAll(async () => {
    if (dataSource) {
      if (courtId) {
        await dataSource.query('DELETE FROM bookings WHERE court_id = $1', [courtId]);
        await dataSource.query('DELETE FROM court_time_slots WHERE court_id = $1', [courtId]);
        await dataSource.query('DELETE FROM courts WHERE id = $1', [courtId]);
      }
      if (createdSportTypeId) {
        await dataSource.query('DELETE FROM sport_types WHERE id = $1', [createdSportTypeId]);
      }
      await dataSource.query(
        "DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_conc_%')",
      );
      await dataSource.query("DELETE FROM users WHERE email LIKE '%_conc_%'");
    }
    if (app) {
      const redis = app.get('REDIS_CLIENT');
      if (redis) await redis.quit();
      await app.close();
    }
  });

  it('should prevent concurrent bookings on the same time slot (S3-07)', async () => {
    // Setup time: Tomorrow 08:00 - 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startTime = formatBusinessTime(tomorrow, 8);
    const endTime = formatBusinessTime(tomorrow, 10);

    const bookingPayload = { courtId, startTime, endTime };

    // Fire 2 booking requests concurrently
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(bookingPayload),
      request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(bookingPayload),
    ]);

    // One must succeed (201), the other must fail with conflict (409)
    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const persisted = await dataSource.query(
      `
        SELECT id, status
        FROM bookings
        WHERE court_id = $1
          AND start_time = $2
          AND end_time = $3
          AND (
            status = $4
            OR (status = $5 AND payment_deadline IS NOT NULL AND payment_deadline > NOW())
          )
      `,
      [courtId, startTime, endTime, BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT],
    );

    expect(persisted).toHaveLength(1);
    expect([BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT]).toContain(persisted[0].status);
  }, 30000);
});
