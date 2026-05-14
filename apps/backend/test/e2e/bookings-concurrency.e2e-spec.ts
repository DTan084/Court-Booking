import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Role } from '@court-booking/shared';
import { DataSource } from 'typeorm';

describe('Bookings Concurrency (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let user1Token: string;
  let user2Token: string;
  let courtId: string;
  let sportTypeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get(DataSource);

    // 1. Create Admin
    const adminEmail = `admin_conc_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'Admin Conc',
      email: adminEmail,
      password: 'Password123!',
    });
    await dataSource.query(`UPDATE users SET role = '${Role.ADMIN}' WHERE email = $1`, [
      adminEmail,
    ]);
    const adminLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: adminEmail,
      password: 'Password123!',
    });
    adminToken = adminLogin.body.access_token;
    const [firstSportType] = await dataSource.query(
      'SELECT id FROM sport_types WHERE is_active = true ORDER BY display_order ASC, created_at ASC LIMIT 1',
    );
    sportTypeId = firstSportType?.id;

    // 2. Create User 1
    const user1Email = `user1_conc_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'User1 Conc',
      email: user1Email,
      password: 'Password123!',
    });
    const user1Login = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: user1Email,
      password: 'Password123!',
    });
    user1Token = user1Login.body.access_token;

    // 3. Create User 2
    const user2Email = `user2_conc_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'User2 Conc',
      email: user2Email,
      password: 'Password123!',
    });
    const user2Login = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: user2Email,
      password: 'Password123!',
    });
    user2Token = user2Login.body.access_token;

    // 4. Create a Court
    const courtRes = await request(app.getHttpServer())
      .post('/api/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sân Conc Test',
        sportTypeId,
        courtType: 'INDOOR',
        address: 'Conc Address',
        pricePerHour: 150000,
      });
    courtId = courtRes.body.id;
  });

  afterAll(async () => {
    // Cleanup bookings
    await dataSource.query('DELETE FROM bookings WHERE court_id = $1', [courtId]);
    // Cleanup court
    await dataSource.query('DELETE FROM courts WHERE id = $1', [courtId]);
    // Cleanup tokens & users
    await dataSource.query(
      "DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_conc_%')",
    );
    await dataSource.query("DELETE FROM users WHERE email LIKE '%_conc_%'");
    await app.close();
  });

  it('should prevent concurrent bookings on the same time slot (S3-07)', async () => {
    // Setup time: Tomorrow 08:00 - 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const startTime = tomorrow.toISOString();

    tomorrow.setHours(10, 0, 0, 0);
    const endTime = tomorrow.toISOString();

    const bookingPayload = { courtId, startTime, endTime };

    // Fire 2 booking requests concurrently
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(bookingPayload),
      request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(bookingPayload),
    ]);

    // One must succeed (201), the other must fail with conflict (409)
    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
  });
});
