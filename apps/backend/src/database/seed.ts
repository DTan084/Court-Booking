import dataSource from './data-source';
import { UserEntity } from './entities/user.entity';
import { CourtEntity } from './entities/court.entity';
import { Role, SportType } from '@court-booking/shared/types';
import * as bcrypt from 'bcrypt';
import { CourtStatus } from './entities/court.entity';

async function runSeed() {
  await dataSource.initialize();
  console.log('Database connected');

  const userRepository = dataSource.getRepository(UserEntity);
  const courtRepository = dataSource.getRepository(CourtEntity);

  // Seed Admin User
  const adminEmail = 'admin@courtbooking.com';
  const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const admin = userRepository.create({
      name: 'Super Admin',
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
    });
    await userRepository.save(admin);
    console.log('Seeded Admin User');
  } else {
    console.log('Admin already exists');
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
    console.log('Seeded Courts');
  } else {
    console.log('Courts already exist');
  }

  await dataSource.destroy();
  console.log('Seed completed');
}

runSeed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
