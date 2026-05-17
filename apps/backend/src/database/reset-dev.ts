import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BookingSource, BookingStatus, CourtType, Role } from '@court-booking/shared';
import dataSource from './data-source';
import { BookingEntity } from './entities/booking.entity';
import { CourtEntity, CourtStatus } from './entities/court.entity';
import { CourtFeatureEntity } from './entities/court-feature.entity';
import { CourtTimeSlotEntity } from './entities/court-time-slot.entity';
import { FeatureEntity } from './entities/feature.entity';
import { SlotTemplateEntity } from './entities/slot-template.entity';
import { SlotTemplateItemEntity } from './entities/slot-template-item.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { UserEntity } from './entities/user.entity';

const logger = new Logger('ResetDevDb');

async function runResetDev() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: reset-dev script attempt in production! ABORTING.');
    return;
  }

  dataSource.setOptions({
    dropSchema: true,
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  logger.log('Database initialized with dropSchema+synchronize');

  const userRepo = dataSource.getRepository(UserEntity);
  const courtRepo = dataSource.getRepository(CourtEntity);
  const timeSlotRepo = dataSource.getRepository(CourtTimeSlotEntity);
  const sportTypeRepo = dataSource.getRepository(SportTypeEntity);
  const featureRepo = dataSource.getRepository(FeatureEntity);
  const courtFeatureRepo = dataSource.getRepository(CourtFeatureEntity);
  const slotTemplateRepo = dataSource.getRepository(SlotTemplateEntity);
  const slotTemplateItemRepo = dataSource.getRepository(SlotTemplateItemEntity);
  const bookingRepo = dataSource.getRepository(BookingEntity);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const userPasswordHash = await bcrypt.hash('User@123', 10);

  const [adminUser, normalUser] = await userRepo.save([
    userRepo.create({
      name: 'Super Admin',
      email: 'admin@courtbooking.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      phone: '0900000001',
    }),
    userRepo.create({
      name: 'Test User',
      email: 'user@courtbooking.com',
      passwordHash: userPasswordHash,
      role: Role.USER,
      phone: '0900000002',
    }),
  ]);

  const sportTypes = await sportTypeRepo.save([
    sportTypeRepo.create({
      name: 'Football',
      icon: 'SOCCER',
      color: '#4CAF50',
      isActive: true,
      displayOrder: 1,
    }),
    sportTypeRepo.create({
      name: 'Badminton',
      icon: 'BADMINTON',
      color: '#2196F3',
      isActive: true,
      displayOrder: 2,
    }),
    sportTypeRepo.create({
      name: 'Tennis',
      icon: 'TENNIS',
      color: '#FF9800',
      isActive: true,
      displayOrder: 3,
    }),
    sportTypeRepo.create({
      name: 'Basketball',
      icon: 'BASKETBALL',
      color: '#FF5722',
      isActive: true,
      displayOrder: 4,
    }),
    sportTypeRepo.create({
      name: 'Volleyball',
      icon: 'VOLLEYBALL',
      color: '#9C27B0',
      isActive: true,
      displayOrder: 5,
    }),
    sportTypeRepo.create({
      name: 'Pickleball',
      icon: 'PICKLEBALL',
      color: '#00BCD4',
      isActive: true,
      displayOrder: 6,
    }),
  ]);

  const badminton = sportTypes.find((item) => item.name === 'Badminton');
  const tennis = sportTypes.find((item) => item.name === 'Tennis');
  const football = sportTypes.find((item) => item.name === 'Football');

  if (!badminton || !tennis || !football) {
    throw new Error('Sport type seed data mismatch');
  }

  const courts = await courtRepo.save([
    courtRepo.create({
      name: 'Badminton Court A1',
      sportTypeId: badminton.id,
      address: '123 Cau Giay, Ha Noi',
      district: 'Cau Giay',
      courtType: CourtType.INDOOR,
      description: 'Standard badminton court for competitive play.',
      pricePerHour: 150000,
      status: CourtStatus.ACTIVE,
      isFeatured: true,
      maxPlayers: 4,
    }),
    courtRepo.create({
      name: 'Premium Tennis Court',
      sportTypeId: tennis.id,
      address: '45 Le Loi, District 1, Ho Chi Minh City',
      district: 'District 1',
      courtType: CourtType.OUTDOOR,
      description: 'High quality hard-court tennis surface.',
      pricePerHour: 250000,
      status: CourtStatus.ACTIVE,
      isFeatured: false,
      maxPlayers: 4,
    }),
    courtRepo.create({
      name: 'Mini Football Court 5v5',
      sportTypeId: football.id,
      address: '89 Nguyen Hue, Da Nang',
      district: 'Hai Chau',
      courtType: CourtType.OUTDOOR,
      description: 'Artificial turf mini football field for 5v5.',
      pricePerHour: 300000,
      status: CourtStatus.ACTIVE,
      isFeatured: true,
      maxPlayers: 10,
    }),
  ]);

  const slots: CourtTimeSlotEntity[] = [];
  for (const court of courts) {
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
      for (let hour = 6; hour < 22; hour += 2) {
        const multiplier = hour < 12 ? 0.8 : hour < 18 ? 1 : 1.2;
        slots.push(
          timeSlotRepo.create({
            courtId: court.id,
            dayOfWeek,
            startHour: hour,
            endHour: hour + 2,
            price: Number(court.pricePerHour) * multiplier,
            templateId: null,
          }),
        );
      }
    }
  }
  await timeSlotRepo.save(slots);

  const features = await featureRepo.save([
    featureRepo.create({ name: 'Roof Cover', icon: 'ROOF', category: 'Facility' }),
    featureRepo.create({ name: 'Night Lights', icon: 'LIGHT', category: 'Facility' }),
    featureRepo.create({ name: 'Wifi', icon: 'WIFI', category: 'Service' }),
    featureRepo.create({ name: 'Parking', icon: 'PARKING', category: 'Facility' }),
    featureRepo.create({ name: 'Changing Room', icon: 'CHANGING', category: 'Facility' }),
    featureRepo.create({ name: 'Security Camera', icon: 'CAMERA', category: 'Safety' }),
  ]);

  const courtFeatureRows: CourtFeatureEntity[] = [];
  for (const court of courts) {
    for (const feature of features.slice(0, 3)) {
      courtFeatureRows.push(
        courtFeatureRepo.create({
          courtId: court.id,
          featureId: feature.id,
        }),
      );
    }
  }
  await courtFeatureRepo.save(courtFeatureRows);

  const template = await slotTemplateRepo.save(
    slotTemplateRepo.create({
      name: 'Default Weekly Template',
      description: 'Baseline slot template for v3 admin testing',
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
  ]);

  await bookingRepo.save(
    bookingRepo.create({
      userId: normalUser.id,
      courtId: courts[0].id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      totalPrice: 180000,
      paymentDeadline: null,
      paidAt: new Date(),
      paymentMethod: 'CASH',
      expiredAt: null,
      completedAt: null,
      cancelledAt: null,
      paymentReminderSent: false,
      bookingReminderSent: false,
      bookingSource: BookingSource.ADMIN,
      checkedInAt: null,
      guestName: 'Walk-in Test Guest',
      guestPhone: '0900000000',
      note: 'Sample booking for admin flow testing',
      cancelledBy: null,
      cancelledReason: null,
      cancellationNote: null,
      refundedAt: null,
      refundAmount: null,
    }),
  );

  logger.log(`Seeded admin: ${adminUser.email} / ${adminPassword}`);
  logger.log('Seeded v3 sample data successfully');

  await dataSource.destroy();
}

runResetDev().catch((err) => {
  logger.error('Reset dev db failed', err);
  process.exit(1);
});
