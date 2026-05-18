import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID, createHash } from 'crypto';
import {
  BookingSource,
  BookingStatus,
  CancelledBy,
  CourtType,
  NotificationType,
  Role,
} from '@court-booking/shared';
import dataSource from './data-source';
import { BookingEntity } from './entities/booking.entity';
import { CourtEntity, CourtStatus } from './entities/court.entity';
import { CourtFeatureEntity } from './entities/court-feature.entity';
import { CourtImageEntity } from './entities/court-image.entity';
import { CourtTimeSlotEntity } from './entities/court-time-slot.entity';
import { FeatureEntity } from './entities/feature.entity';
import { NotificationEntity } from './entities/notification.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { SlotTemplateEntity } from './entities/slot-template.entity';
import { SlotTemplateItemEntity } from './entities/slot-template-item.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { SystemSettingEntity } from './entities/system-setting.entity';
import { UserEntity } from './entities/user.entity';

const logger = new Logger('SeedFull');

/** Returns a Date at the given hour with a day offset from today. */
function dateAt(days: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function runSeedFull() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: seed attempt in production! ABORTING.');
    process.exit(1);
  }
  // 1. Reset schema
  dataSource.setOptions({ dropSchema: true, synchronize: true, logging: false });
  await dataSource.initialize();
  logger.log('[ok] Database reset (drop + synchronize)');
  // Repositories
  const userRepo = dataSource.getRepository(UserEntity);
  const courtRepo = dataSource.getRepository(CourtEntity);
  const imageRepo = dataSource.getRepository(CourtImageEntity);
  const timeSlotRepo = dataSource.getRepository(CourtTimeSlotEntity);
  const sportTypeRepo = dataSource.getRepository(SportTypeEntity);
  const featureRepo = dataSource.getRepository(FeatureEntity);
  const courtFeatureRepo = dataSource.getRepository(CourtFeatureEntity);
  const slotTemplateRepo = dataSource.getRepository(SlotTemplateEntity);
  const slotTemplateItemRepo = dataSource.getRepository(SlotTemplateItemEntity);
  const bookingRepo = dataSource.getRepository(BookingEntity);
  const notificationRepo = dataSource.getRepository(NotificationEntity);
  const refreshTokenRepo = dataSource.getRepository(RefreshTokenEntity);
  const settingRepo = dataSource.getRepository(SystemSettingEntity);
  // 2. Seed users
  const adminPwd = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const userPwd = process.env.SEED_USER_PASSWORD || 'User@123';
  const adminHash = await bcrypt.hash(adminPwd, 10);
  const userHash = await bcrypt.hash(userPwd, 10);

  const [adminUser, user1, user2, user3] = await userRepo.save([
    userRepo.create({
      name: 'Super Admin',
      email: 'admin@courtbooking.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      phone: '0900000001',
      avatarUrl: 'https://picsum.photos/seed/admin/200/200',
    }),
    userRepo.create({
      name: 'Nguyen Van A',
      email: 'user@courtbooking.com',
      passwordHash: userHash,
      role: Role.USER,
      phone: '0900000002',
      avatarUrl: 'https://picsum.photos/seed/user1/200/200',
      dob: '1995-06-15',
    }),
    userRepo.create({
      name: 'Tran Thi B',
      email: 'user2@courtbooking.com',
      passwordHash: userHash,
      role: Role.USER,
      phone: '0900000003',
      avatarUrl: 'https://picsum.photos/seed/user2/200/200',
      dob: '1998-03-22',
    }),
    userRepo.create({
      name: 'Le Van C',
      email: 'user3@courtbooking.com',
      passwordHash: userHash,
      role: Role.USER,
      phone: '0900000004',
      avatarUrl: 'https://picsum.photos/seed/user3/200/200',
    }),
  ]);
  logger.log(`[ok] Seeded 4 users`);
  // Refresh token for user1 to exercise remember-me and auto-login flows.
  const rawToken = randomUUID();
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');
  await refreshTokenRepo.save(
    refreshTokenRepo.create({
      userId: user1.id,
      token: hashedToken,
      expiresAt: dateAt(30, 0),
      revoked: false,
    }),
  );
  // 3. Seed sport types
  const sportTypeDefs = [
    { name: 'Football', icon: 'SOCCER', color: '#4CAF50', order: 1 },
    { name: 'Badminton', icon: 'BADMINTON', color: '#2196F3', order: 2 },
    { name: 'Tennis', icon: 'TENNIS', color: '#FF9800', order: 3 },
    { name: 'Basketball', icon: 'BASKETBALL', color: '#FF5722', order: 4 },
    { name: 'Volleyball', icon: 'VOLLEYBALL', color: '#9C27B0', order: 5 },
    { name: 'Pickleball', icon: 'PICKLEBALL', color: '#00BCD4', order: 6 },
  ];
  const sportTypes = await sportTypeRepo.save(
    sportTypeDefs.map((s) =>
      sportTypeRepo.create({
        name: s.name,
        icon: s.icon,
        color: s.color,
        isActive: true,
        displayOrder: s.order,
      }),
    ),
  );
  const [football, badminton, tennis, , , pickleball] = sportTypes;
  logger.log(`[ok] Seeded ${sportTypes.length} sport types`);
  // 4. Seed features
  const featureDefs = [
    { name: 'Roof Cover', icon: 'ROOF', category: 'Facility' },
    { name: 'Night Lights', icon: 'LIGHT', category: 'Facility' },
    { name: 'Wifi', icon: 'WIFI', category: 'Service' },
    { name: 'Parking', icon: 'PARKING', category: 'Facility' },
    { name: 'Changing Room', icon: 'CHANGING', category: 'Facility' },
    { name: 'Security Camera', icon: 'CAMERA', category: 'Safety' },
  ];
  const features = await featureRepo.save(
    featureDefs.map((f) => featureRepo.create({ ...f, isActive: true })),
  );
  logger.log(`[ok] Seeded ${features.length} features`);
  // 5. Seed courts
  const courtDefs = [
    {
      name: 'Badminton Court A1',
      sportTypeId: badminton.id,
      address: '123 Cau Giay, Hanoi',
      district: 'Cau Giay',
      courtType: CourtType.INDOOR,
      description: 'Competition-grade badminton court with premium wood flooring and LED lighting.',
      pricePerHour: 150000,
      status: CourtStatus.ACTIVE,
      isFeatured: true,
      maxPlayers: 4,
      features: [0, 1, 2, 4], // feature indexes
    },
    {
      name: 'Premium Tennis Court',
      sportTypeId: tennis.id,
      address: '45 Le Loi, District 1, Ho Chi Minh City',
      district: 'District 1',
      courtType: CourtType.OUTDOOR,
      description: 'Premium hard tennis court with a small spectator stand for match viewing.',
      pricePerHour: 250000,
      status: CourtStatus.ACTIVE,
      isFeatured: false,
      maxPlayers: 4,
      features: [1, 2, 3, 5],
    },
    {
      name: 'Mini Football 5v5',
      sportTypeId: football.id,
      address: '89 Nguyen Hue, Da Nang',
      district: 'Hai Chau',
      courtType: CourtType.OUTDOOR,
      description:
        '5v5 mini football field with third-generation artificial turf for casual play and fixtures.',
      pricePerHour: 300000,
      status: CourtStatus.ACTIVE,
      isFeatured: true,
      maxPlayers: 10,
      features: [0, 1, 3, 4, 5],
    },
    {
      name: 'Pickleball Court P1',
      sportTypeId: pickleball.id,
      address: '22 Vo Van Kiet, District 1, Ho Chi Minh City',
      district: 'District 1',
      courtType: CourtType.INDOOR,
      description: 'Indoor pickleball court with dedicated flooring and tournament-grade lighting.',
      pricePerHour: 180000,
      status: CourtStatus.ACTIVE,
      isFeatured: false,
      maxPlayers: 4,
      features: [0, 1, 2, 3],
    },
    {
      name: 'Badminton Court B2 (Maintenance)',
      sportTypeId: badminton.id,
      address: '10 Hoang Hoa Tham, Hanoi',
      district: 'Ba Dinh',
      courtType: CourtType.INDOOR,
      description: 'Court currently unavailable for scheduled maintenance.',
      pricePerHour: 120000,
      status: CourtStatus.INACTIVE,
      isFeatured: false,
      maxPlayers: 4,
      features: [0, 1],
    },
  ];

  const courts: CourtEntity[] = [];
  for (const def of courtDefs) {
    const { features: featureIndices, ...courtData } = def;
    const court = await courtRepo.save(courtRepo.create(courtData));
    courts.push(court);

    // Images
    await imageRepo.save([
      imageRepo.create({
        courtId: court.id,
        url: `https://picsum.photos/seed/${court.id}a/1200/800`,
        altText: `${court.name} - image 1`,
        displayOrder: 1,
      }),
      imageRepo.create({
        courtId: court.id,
        url: `https://picsum.photos/seed/${court.id}b/1200/800`,
        altText: `${court.name} - image 2`,
        displayOrder: 2,
      }),
    ]);
    // Time slots from 06:00 to 22:00 with off-peak, standard, and peak pricing.
    const slots: CourtTimeSlotEntity[] = [];
    for (let day = 0; day <= 6; day++) {
      for (let hour = 6; hour < 22; hour += 2) {
        const multiplier = hour < 12 ? 0.8 : hour < 18 ? 1.0 : 1.2;
        slots.push(
          timeSlotRepo.create({
            courtId: court.id,
            dayOfWeek: day,
            startHour: hour,
            endHour: hour + 2,
            price: Math.round(Number(court.pricePerHour) * multiplier),
          }),
        );
      }
    }
    await timeSlotRepo.save(slots);

    // Court features
    const courtFeatureRows = featureIndices.map((i) =>
      courtFeatureRepo.create({ courtId: court.id, featureId: features[i].id }),
    );
    await courtFeatureRepo.save(courtFeatureRows);
  }
  logger.log(`[ok] Seeded ${features.length} features`);
  // 6. Seed slot templates
  const template = await slotTemplateRepo.save(
    slotTemplateRepo.create({
      name: 'Default Weekly Template',
      description: 'Default template for exercising admin slot management.',
      isActive: true,
    }),
  );
  await slotTemplateItemRepo.save([
    slotTemplateItemRepo.create({
      templateId: template.id,
      dayOfWeek: 1,
      startHour: '09:00:00',
      endHour: '10:00:00',
      price: 180000,
    }),
    slotTemplateItemRepo.create({
      templateId: template.id,
      dayOfWeek: 1,
      startHour: '10:00:00',
      endHour: '11:00:00',
      price: 180000,
    }),
    slotTemplateItemRepo.create({
      templateId: template.id,
      dayOfWeek: 3,
      startHour: '18:00:00',
      endHour: '19:00:00',
      price: 240000,
    }),
    slotTemplateItemRepo.create({
      templateId: template.id,
      dayOfWeek: 5,
      startHour: '19:00:00',
      endHour: '20:00:00',
      price: 260000,
    }),
    slotTemplateItemRepo.create({
      templateId: template.id,
      dayOfWeek: 6,
      startHour: '08:00:00',
      endHour: '10:00:00',
      price: 200000,
    }),
  ]);
  logger.log(`[ok] Seeded slot template`);
  // 7. Seed bookings across key statuses
  const bookings = await bookingRepo.save([
    // CONFIRMED - live for user1 (test My Bookings "Live & Upcoming")
    bookingRepo.create({
      userId: user1.id,
      courtId: courts[0].id,
      startTime: (() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - 20);
        return d;
      })(),
      endTime: (() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 70);
        return d;
      })(),
      status: BookingStatus.CONFIRMED,
      totalPrice: 240000,
      paymentDeadline: null,
      paidAt: (() => {
        const d = new Date();
        d.setHours(d.getHours() - 1);
        return d;
      })(),
      paymentMethod: 'CARD',
      checkedInAt: (() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - 10);
        return d;
      })(),
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: true,
      paymentReminderSent: false,
      note: '[visual-seed] Live booking for user1',
    }),
    // CONFIRMED future booking for user1 on court 0
    bookingRepo.create({
      userId: user1.id,
      courtId: courts[0].id,
      startTime: dateAt(1, 8),
      endTime: dateAt(1, 10),
      status: BookingStatus.CONFIRMED,
      totalPrice: 240000,
      paymentDeadline: null,
      paidAt: new Date(),
      paymentMethod: 'CASH',
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: false,
      paymentReminderSent: false,
      note: 'Confirmed booking for reminder-flow testing',
    }),
    // PENDING_PAYMENT future booking for user1 on court 1
    bookingRepo.create({
      userId: user1.id,
      courtId: courts[1].id,
      startTime: dateAt(2, 14),
      endTime: dateAt(2, 16),
      status: BookingStatus.PENDING_PAYMENT,
      totalPrice: 500000,
      paymentDeadline: dateAt(2, 13),
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: false,
      paymentReminderSent: false,
      note: 'Pending-payment booking for payment-flow testing',
    }),
    // COMPLETED historical booking for user1 on court 1
    bookingRepo.create({
      userId: user1.id,
      courtId: courts[1].id,
      startTime: dateAt(-3, 8),
      endTime: dateAt(-3, 10),
      status: BookingStatus.COMPLETED,
      totalPrice: 500000,
      paidAt: dateAt(-3, 7),
      paymentMethod: 'TRANSFER',
      completedAt: dateAt(-3, 10),
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: true,
      paymentReminderSent: true,
    }),
    // CANCELLED by USER for a future booking on court 2
    bookingRepo.create({
      userId: user1.id,
      courtId: courts[2].id,
      startTime: dateAt(4, 16),
      endTime: dateAt(4, 18),
      status: BookingStatus.CANCELLED,
      totalPrice: 360000,
      cancelledAt: new Date(),
      cancelledBy: CancelledBy.USER,
      cancelledReason: 'Unexpected schedule conflict',
      cancellationNote: 'Please process the refund',
      refundedAt: new Date(),
      refundAmount: 360000,
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: false,
      paymentReminderSent: false,
    }),
    // CANCELLED by ADMIN for user2 on court 0
    bookingRepo.create({
      userId: user2.id,
      courtId: courts[0].id,
      startTime: dateAt(5, 10),
      endTime: dateAt(5, 12),
      status: BookingStatus.CANCELLED,
      totalPrice: 240000,
      cancelledAt: new Date(),
      cancelledBy: CancelledBy.ADMIN,
      cancelledReason: 'Emergency court maintenance',
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: false,
      paymentReminderSent: false,
    }),
    // CANCELLED + paidAt but not refunded (test admin REFUND_PENDING view)
    bookingRepo.create({
      userId: user2.id,
      courtId: courts[3].id,
      startTime: dateAt(-2, 12),
      endTime: dateAt(-2, 14),
      status: BookingStatus.CANCELLED,
      totalPrice: 288000,
      paidAt: dateAt(-2, 9),
      paymentMethod: 'CARD',
      cancelledAt: dateAt(-2, 10),
      cancelledBy: CancelledBy.ADMIN,
      cancelledReason: 'Court closed unexpectedly',
      cancellationNote: 'Waiting for refund processing',
      refundedAt: null,
      refundAmount: null,
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: false,
      paymentReminderSent: false,
      note: '[visual-seed] Refund pending case',
    }),
    // EXPIRED because payment was not completed in time
    bookingRepo.create({
      userId: user2.id,
      courtId: courts[3].id,
      startTime: dateAt(1, 14),
      endTime: dateAt(1, 16),
      status: BookingStatus.EXPIRED,
      totalPrice: 360000,
      paymentDeadline: dateAt(-1, 10),
      expiredAt: new Date(),
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: false,
      paymentReminderSent: true,
      note: 'Expired booking for auto-expire job testing',
    }),
    // CONFIRMED walk-in booking on court 1
    bookingRepo.create({
      userId: null,
      guestName: 'Walk-in Guest',
      guestPhone: '0901234567',
      courtId: courts[1].id,
      startTime: dateAt(3, 10),
      endTime: dateAt(3, 12),
      status: BookingStatus.CONFIRMED,
      totalPrice: 500000,
      paidAt: new Date(),
      paymentMethod: 'CASH',
      bookingSource: BookingSource.WALK_IN,
      bookingReminderSent: false,
      paymentReminderSent: false,
      note: 'Walk-in booking created at the front desk',
    }),
    // CONFIRMED admin-created booking with check-in
    bookingRepo.create({
      userId: user3.id,
      courtId: courts[2].id,
      startTime: dateAt(0, 18),
      endTime: dateAt(0, 20),
      status: BookingStatus.CONFIRMED,
      totalPrice: 360000,
      paidAt: new Date(),
      paymentMethod: 'CASH',
      checkedInAt: new Date(),
      bookingSource: BookingSource.ADMIN,
      bookingReminderSent: true,
      paymentReminderSent: false,
      note: 'Admin-created booking with completed check-in',
    }),
    // COMPLETED historical booking for user2 on court 2
    bookingRepo.create({
      userId: user2.id,
      courtId: courts[2].id,
      startTime: dateAt(-7, 16),
      endTime: dateAt(-7, 18),
      status: BookingStatus.COMPLETED,
      totalPrice: 360000,
      paidAt: dateAt(-7, 15),
      paymentMethod: 'CARD',
      completedAt: dateAt(-7, 18),
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: true,
      paymentReminderSent: true,
    }),
    // CONFIRMED future booking far enough out to exercise calendar views
    bookingRepo.create({
      userId: user3.id,
      courtId: courts[3].id,
      startTime: dateAt(14, 8),
      endTime: dateAt(14, 10),
      status: BookingStatus.CONFIRMED,
      totalPrice: 288000,
      paidAt: new Date(),
      paymentMethod: 'TRANSFER',
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: false,
      paymentReminderSent: false,
    }),
    // CONFIRMED booking currently in progress for "My Bookings > Live"
    bookingRepo.create({
      userId: user2.id,
      courtId: courts[0].id,
      startTime: (() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - 30);
        return d;
      })(),
      endTime: (() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 90);
        return d;
      })(),
      status: BookingStatus.CONFIRMED,
      totalPrice: 240000,
      paidAt: (() => {
        const d = new Date();
        d.setHours(d.getHours() - 2);
        return d;
      })(),
      paymentMethod: 'CASH',
      checkedInAt: (() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - 25);
        return d;
      })(),
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: true,
      paymentReminderSent: false,
      note: 'Live booking for the "Live & Upcoming" tab',
    }),
    // CANCELLED by SYSTEM due to policy enforcement
    bookingRepo.create({
      userId: user3.id,
      courtId: courts[1].id,
      startTime: dateAt(-1, 14),
      endTime: dateAt(-1, 16),
      status: BookingStatus.CANCELLED,
      totalPrice: 400000,
      cancelledAt: dateAt(-1, 13),
      cancelledBy: CancelledBy.SYSTEM,
      cancelledReason: 'NO_SHOW',
      cancellationNote: 'Automatically cancelled after failing to check in within 15 minutes',
      bookingSource: BookingSource.ONLINE,
      bookingReminderSent: true,
      paymentReminderSent: false,
      note: 'System-cancelled booking for policy testing',
    }),
  ]);
  // Revenue history across the last 30 days for analytics views
  const revenueHistory = [];
  const revenueUsers = [user1, user2, user3];
  const revenueCourts = [courts[0], courts[1], courts[2], courts[3]];
  // Create completed bookings distributed across the last 30 days.
  const revenueDays = [-29, -26, -23, -20, -18, -15, -13, -10, -8, -6, -5, -4, -3, -2, -1];
  for (let i = 0; i < revenueDays.length; i++) {
    const day = revenueDays[i];
    const court = revenueCourts[i % revenueCourts.length];
    const user = revenueUsers[i % revenueUsers.length];
    const price = Number(court.pricePerHour) * 2; // 2 hours
    revenueHistory.push(
      bookingRepo.create({
        userId: user.id,
        courtId: court.id,
        startTime: dateAt(day, 8 + (i % 4) * 2),
        endTime: dateAt(day, 10 + (i % 4) * 2),
        status: BookingStatus.COMPLETED,
        totalPrice: price,
        paidAt: dateAt(day, 7),
        paymentMethod: ['CASH', 'TRANSFER', 'CARD'][i % 3],
        completedAt: dateAt(day, 10 + (i % 4) * 2),
        bookingSource: BookingSource.ONLINE,
        bookingReminderSent: true,
        paymentReminderSent: true,
        note: `[revenue-seed] day ${day}`,
      }),
    );
  }
  const revenueBookings = await bookingRepo.save(revenueHistory);
  const allBookings = [...bookings, ...revenueBookings];
  logger.log(
    `[ok] Seeded ${bookings.length + revenueBookings.length} bookings across key statuses, sources, and 30-day history`,
  );
  // 8. Seed notifications
  const findBooking = (predicate: (booking: BookingEntity) => boolean) => {
    const found = allBookings.find(predicate);
    if (!found) {
      throw new Error('Expected seeded booking was not found for notifications');
    }
    return found;
  };

  const userConfirmedLive = findBooking(
    (booking) =>
      booking.userId === user1.id && booking.note === '[visual-seed] Live booking for user1',
  );
  const userPendingPayment = findBooking(
    (booking) => booking.userId === user1.id && booking.status === BookingStatus.PENDING_PAYMENT,
  );
  const userUpcomingConfirmed = findBooking(
    (booking) =>
      booking.userId === user1.id &&
      booking.status === BookingStatus.CONFIRMED &&
      booking.bookingReminderSent === false &&
      booking.paymentMethod === 'CASH',
  );
  const userCompleted = findBooking(
    (booking) =>
      booking.userId === user1.id &&
      booking.status === BookingStatus.COMPLETED &&
      booking.completedAt !== null,
  );
  const userCancelled = findBooking(
    (booking) => booking.userId === user1.id && booking.cancelledBy === CancelledBy.USER,
  );
  const adminCancelled = findBooking(
    (booking) => booking.userId === user2.id && booking.cancelledBy === CancelledBy.ADMIN,
  );
  const expiredBooking = findBooking(
    (booking) => booking.userId === user2.id && booking.status === BookingStatus.EXPIRED,
  );
  const systemCancelled = findBooking(
    (booking) => booking.userId === user3.id && booking.cancelledBy === CancelledBy.SYSTEM,
  );

  await notificationRepo.save([
    notificationRepo.create({
      userId: user1.id,
      bookingId: userConfirmedLive.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Booking confirmed',
      message: 'Your booking has been confirmed. See you at the court.',
      isRead: false,
    }),
    notificationRepo.create({
      userId: user1.id,
      bookingId: userPendingPayment.id,
      type: NotificationType.PAYMENT_REMINDER,
      title: 'Payment reminder',
      message: 'Please complete payment before the deadline to keep your reservation.',
      isRead: false,
    }),
    notificationRepo.create({
      userId: user1.id,
      bookingId: userUpcomingConfirmed.id,
      type: NotificationType.BOOKING_REMINDER,
      title: 'Upcoming play reminder',
      message: 'You have an upcoming session tomorrow at 08:00.',
      isRead: true,
    }),
    notificationRepo.create({
      userId: user1.id,
      bookingId: userCancelled.id,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking cancelled',
      message: 'Your booking was cancelled at your request.',
      isRead: true,
    }),
    notificationRepo.create({
      userId: user1.id,
      bookingId: userCompleted.id,
      type: NotificationType.BOOKING_COMPLETED,
      title: 'Booking completed',
      message: 'Your session has been marked as completed.',
      isRead: true,
    }),
    notificationRepo.create({
      userId: user1.id,
      bookingId: userCancelled.id,
      type: NotificationType.REFUND_PROCESSED,
      title: 'Refund processed',
      message: 'Your refund has been processed successfully.',
      isRead: false,
    }),
    notificationRepo.create({
      userId: user2.id,
      bookingId: adminCancelled.id,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking cancelled by admin',
      message: 'Your booking was cancelled by staff because the court became unavailable.',
      isRead: false,
    }),
    notificationRepo.create({
      userId: user2.id,
      bookingId: expiredBooking.id,
      type: NotificationType.BOOKING_EXPIRED,
      title: 'Booking expired',
      message: 'Your reservation expired because payment was not completed in time.',
      isRead: false,
    }),
    notificationRepo.create({
      userId: user3.id,
      bookingId: systemCancelled.id,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking cancelled by system',
      message: 'Your booking was cancelled automatically by system policy.',
      isRead: false,
    }),
  ]);
  logger.log(`[ok] Seeded notifications`);
  // 9. Seed system settings
  const settings = [
    { key: 'default_timezone', value: 'Asia/Ho_Chi_Minh' },
    { key: 'payment_deadline_minutes', value: '30' },
    { key: 'cancel_within_hours', value: '24' },
    { key: 'no_cancel_before_hours', value: '12' },
    { key: 'analytics_start_hour', value: '6' },
    { key: 'analytics_end_hour', value: '22' },
    { key: 'max_booking_days_ahead', value: '30' },
  ];
  await settingRepo.save(settings.map((s) => settingRepo.create(s)));
  logger.log(`[ok] Seeded ${settings.length} system settings`);
  // Summary
  logger.log('');
  logger.log('================ SEED COMPLETED ================');
  logger.log(`Admin : admin@courtbooking.com  /  ${adminPwd}`);
  logger.log(`User 1: user@courtbooking.com   /  ${userPwd}`);
  logger.log(`User 2: user2@courtbooking.com  /  ${userPwd}`);
  logger.log(`User 3: user3@courtbooking.com  /  ${userPwd}`);
  logger.log('================================================');

  await dataSource.destroy();
}

runSeedFull().catch((err) => {
  logger.error('Seed full failed:', err);
  process.exit(1);
});
