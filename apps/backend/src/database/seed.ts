import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@court-booking/shared/types';
import dataSource from './data-source';
import { CourtEntity, CourtStatus } from './entities/court.entity';
import { CourtTimeSlotEntity } from './entities/court-time-slot.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { UserEntity } from './entities/user.entity';

const logger = new Logger('DatabaseSeed');

async function runSeed() {
  await dataSource.initialize();
  logger.log('Database connected');

  const userRepository = dataSource.getRepository(UserEntity);
  const courtRepository = dataSource.getRepository(CourtEntity);
  const timeSlotRepository = dataSource.getRepository(CourtTimeSlotEntity);
  const sportTypeRepository = dataSource.getRepository(SportTypeEntity);

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

  let sportTypes = await sportTypeRepository.find();
  if (sportTypes.length === 0) {
    sportTypes = await sportTypeRepository.save([
      sportTypeRepository.create({
        name: 'Football',
        icon: 'SOCCER',
        color: '#4CAF50',
        isActive: true,
        displayOrder: 1,
      }),
      sportTypeRepository.create({
        name: 'Badminton',
        icon: 'BADMINTON',
        color: '#2196F3',
        isActive: true,
        displayOrder: 2,
      }),
      sportTypeRepository.create({
        name: 'Tennis',
        icon: 'TENNIS',
        color: '#FF9800',
        isActive: true,
        displayOrder: 3,
      }),
    ]);
    logger.log('Seeded Sport Types');
  }

  const badminton = sportTypes.find((item) => item.name.toLowerCase() === 'badminton');
  const tennis = sportTypes.find((item) => item.name.toLowerCase() === 'tennis');
  const football = sportTypes.find((item) => item.name.toLowerCase() === 'football');
  if (!badminton || !tennis || !football) {
    throw new Error('Missing base sport types for court seed');
  }

  const existingCourts = await courtRepository.find();
  if (existingCourts.length === 0) {
    const courts = [
      courtRepository.create({
        name: 'Badminton Court A1',
        sportTypeId: badminton.id,
        address: '123 Cau Giay, Ha Noi',
        pricePerHour: 150000,
        status: CourtStatus.ACTIVE,
      }),
      courtRepository.create({
        name: 'Premium Tennis Court',
        sportTypeId: tennis.id,
        address: '45 Le Loi, District 1, Ho Chi Minh City',
        pricePerHour: 250000,
        status: CourtStatus.ACTIVE,
      }),
      courtRepository.create({
        name: 'Mini Football Court 5v5',
        sportTypeId: football.id,
        address: '89 Nguyen Hue, Da Nang',
        pricePerHour: 300000,
        status: CourtStatus.ACTIVE,
      }),
    ];
    await courtRepository.save(courts);
    logger.log('Seeded Courts');

    for (const court of courts) {
      const timeSlots: CourtTimeSlotEntity[] = [];
      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
        for (let hour = 6; hour < 12; hour += 2) {
          timeSlots.push(
            timeSlotRepository.create({
              courtId: court.id,
              dayOfWeek,
              startHour: hour,
              endHour: hour + 2,
              price: Number(court.pricePerHour) * 0.8,
            }),
          );
        }
        for (let hour = 12; hour < 18; hour += 2) {
          timeSlots.push(
            timeSlotRepository.create({
              courtId: court.id,
              dayOfWeek,
              startHour: hour,
              endHour: hour + 2,
              price: Number(court.pricePerHour),
            }),
          );
        }
        for (let hour = 18; hour < 22; hour += 2) {
          timeSlots.push(
            timeSlotRepository.create({
              courtId: court.id,
              dayOfWeek,
              startHour: hour,
              endHour: hour + 2,
              price: Number(court.pricePerHour) * 1.2,
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
