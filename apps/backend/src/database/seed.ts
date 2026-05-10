import { Logger } from '@nestjs/common';
import dataSource from './data-source';
import { UserEntity } from './entities/user.entity';
import { CourtEntity } from './entities/court.entity';
import { CourtTimeSlotEntity } from './entities/court-time-slot.entity';
import { Role, SportType } from '@court-booking/shared/types';
import * as bcrypt from 'bcrypt';
import { CourtStatus } from './entities/court.entity';

const logger = new Logger('DatabaseSeed');

async function runSeed() {
  await dataSource.initialize();
  logger.log('Database connected');

  const userRepository = dataSource.getRepository(UserEntity);
  const courtRepository = dataSource.getRepository(CourtEntity);
  const timeSlotRepository = dataSource.getRepository(CourtTimeSlotEntity);

  // Seed Admin User
  const adminEmail = 'admin@courtbooking.com';
  const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = userRepository.create({
      name: 'Super Admin',
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
    });
    await userRepository.save(admin);
    logger.log('Seeded Admin User');
  } else {
    logger.log('Admin already exists');
  }

  // Seed Courts
  const existingCourts = await courtRepository.find();
  if (existingCourts.length === 0) {
    const courts = [
      courtRepository.create({
        name: 'Sân Cầu Lông A1',
        sportType: SportType.BADMINTON,
        address: '123 Cầu Giấy, Hà Nội',
        pricePerHour: 150000,
        status: CourtStatus.ACTIVE,
      }),
      courtRepository.create({
        name: 'Sân Tennis VVIP',
        sportType: SportType.TENNIS,
        address: '45 Lê Lợi, Q1, HCM',
        pricePerHour: 250000,
        status: CourtStatus.ACTIVE,
      }),
      courtRepository.create({
        name: 'Sân Bóng Đá Mini (5 người)',
        sportType: SportType.FOOTBALL,
        address: '89 Nguyễn Huệ, Đà Nẵng',
        pricePerHour: 300000,
        status: CourtStatus.ACTIVE,
      }),
    ];
    await courtRepository.save(courts);
    logger.log('Seeded Courts');

    // Seed Time Slots for each court
    for (const court of courts) {
      const timeSlots: CourtTimeSlotEntity[] = [];

      // Create time slots for all days of week (0 = Sunday, 6 = Saturday)
      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
        // Morning slots: 6-12 (cheaper)
        for (let hour = 6; hour < 12; hour += 2) {
          timeSlots.push(
            timeSlotRepository.create({
              courtId: court.id,
              dayOfWeek,
              startHour: hour,
              endHour: hour + 2,
              price: court.pricePerHour * 0.8, // 20% discount for morning
            }),
          );
        }

        // Afternoon slots: 12-18 (normal price)
        for (let hour = 12; hour < 18; hour += 2) {
          timeSlots.push(
            timeSlotRepository.create({
              courtId: court.id,
              dayOfWeek,
              startHour: hour,
              endHour: hour + 2,
              price: court.pricePerHour,
            }),
          );
        }

        // Evening slots: 18-22 (premium price)
        for (let hour = 18; hour < 22; hour += 2) {
          timeSlots.push(
            timeSlotRepository.create({
              courtId: court.id,
              dayOfWeek,
              startHour: hour,
              endHour: hour + 2,
              price: court.pricePerHour * 1.2, // 20% premium for evening
            }),
          );
        }
      }

      await timeSlotRepository.save(timeSlots);
      logger.log(`Seeded ${timeSlots.length} time slots for court: ${court.name}`);
    }
  } else {
    logger.log('Courts already exist');
  }

  await dataSource.destroy();
  logger.log('Seed completed');
}

runSeed().catch((err) => {
  logger.error('Seed error:', err);
  process.exit(1);
});
