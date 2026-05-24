import { createHmac } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { BookingStatus, Role } from '@court-booking/shared';
import { AppModule } from '../../src/app.module';

describe('VNPay Payment Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let courtId: string;
  let bookingId: string;
  let paymentId: string;
  let sportTypeId: string;
  let createdSportTypeId: string | undefined;

  const userEmail = `user_pay_${Date.now()}@example.com`;
  const adminEmail = `admin_pay_${Date.now()}@example.com`;
  const password = 'Password123!';

  const formatBusinessTime = (date: Date, hour: number) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${String(hour).padStart(2, '0')}:00:00+07:00`;
  };

  const signVnpPayload = (payload: Record<string, string>) => {
    const secret = process.env.VNPAY_HASH_SECRET || '';
    const signData = Object.keys(payload)
      .sort()
      .map((k) => `${k}=${encodeURIComponent(payload[k]).replace(/%20/g, '+')}`)
      .join('&');
    return createHmac('sha512', secret).update(signData).digest('hex');
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
        [`E2E Payment Sport ${Date.now()}`, 'TENNIS', '#2563EB'],
      );
      sportTypeId = insertedSportType.id;
      createdSportTypeId = insertedSportType.id;
    }

    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      name: 'Admin Payment',
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

    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      name: 'User Payment',
      email: userEmail,
      password,
    });
    const userLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: userEmail,
      password,
    });
    userToken = userLogin.body.access_token;

    const courtRes = await request(app.getHttpServer())
      .post('/api/v1/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Payment Test Court',
        sportTypeId,
        courtType: 'INDOOR',
        address: 'Payment Address',
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
  }, 45000);

  afterAll(async () => {
    if (dataSource) {
      if (paymentId)
        await dataSource.query('DELETE FROM payment_events WHERE payment_id = $1', [paymentId]);
      if (paymentId) await dataSource.query('DELETE FROM payments WHERE id = $1', [paymentId]);
      if (bookingId) await dataSource.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
      if (courtId)
        await dataSource.query('DELETE FROM court_time_slots WHERE court_id = $1', [courtId]);
      if (courtId) await dataSource.query('DELETE FROM courts WHERE id = $1', [courtId]);
      if (createdSportTypeId) {
        await dataSource.query('DELETE FROM sport_types WHERE id = $1', [createdSportTypeId]);
      }
      await dataSource.query(
        "DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_pay_%')",
      );
      await dataSource.query("DELETE FROM users WHERE email LIKE '%_pay_%'");
    }
    if (app) {
      const redis = app.get('REDIS_CLIENT');
      if (redis) await redis.quit();
      await app.close();
    }
  });

  it('should process signed VNPay IPN and converge booking to CONFIRMED', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const bookingRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        courtId,
        startTime: formatBusinessTime(tomorrow, 14),
        endTime: formatBusinessTime(tomorrow, 16),
      })
      .expect(201);

    bookingId = bookingRes.body.id;
    expect(bookingRes.body.status).toBe(BookingStatus.PENDING_PAYMENT);

    const initiateRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookingId, provider: 'VNPAY' })
      .expect(201);

    paymentId = initiateRes.body.paymentId;
    const txnRef = initiateRes.body.providerOrderId;
    expect(txnRef).toContain('VNPAY-');

    const ipnPayload: Record<string, string> = {
      vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'E2ETMN',
      vnp_TxnRef: txnRef,
      vnp_TransactionNo: `TXN${Date.now()}`,
      vnp_Amount: '20000000',
      vnp_ResponseCode: '00',
    };
    ipnPayload.vnp_SecureHash = signVnpPayload(ipnPayload);

    const ipnRes = await request(app.getHttpServer())
      .post('/api/v1/payments/vnpay/ipn')
      .send(ipnPayload)
      .expect(200);

    expect(ipnRes.body).toEqual({ RspCode: '00', Message: 'Confirm Success' });

    const paymentStatusRes = await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}/status`)
      .expect(200);

    expect(paymentStatusRes.body.paymentStatus).toBe('SUCCESS');
    expect(paymentStatusRes.body.bookingStatus).toBe('CONFIRMED');
  });
});
