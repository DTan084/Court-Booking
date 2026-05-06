import { Logger } from '@nestjs/common';
import dataSource from './data-source';
import { CourtEntity } from './entities/court.entity';
import { CourtTimeSlotEntity } from './entities/court-time-slot.entity';

const logger = new Logger('SeedTimeSlots');

async function seedTimeSlots() {
  await dataSource.initialize();
  logger.log('Database connected');

  const courtRepository = dataSource.getRepository(CourtEntity);
  const timeSlotRepository = dataSource.getRepository(CourtTimeSlotEntity);

  // Get all courts
  const courts = await courtRepository.find();
  logger.log(`Found ${courts.length} courts`);

  for (const court of courts) {
    // Check if time slots already exist for this court
    const existingSlots = await timeSlotRepository.count({ where: { courtId: court.id } });

    if (existingSlots > 0) {
      logger.log(`Court "${court.name}" already has ${existingSlots} time slots, skipping...`);
      continue;
    }

    const timeSlots: CourtTimeSlotEntity[] = [];

    // Create time slots for all days of week (0 = Sunday, 6 = Saturday)
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      // Morning slots: 6-12 (cheaper - 20% discount)
      for (let hour = 6; hour < 12; hour += 2) {
        timeSlots.push(
          timeSlotRepository.create({
            courtId: court.id,
            dayOfWeek,
            startHour: hour,
            endHour: hour + 2,
            price: Math.round(court.pricePerHour * 0.8),
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

      // Evening slots: 18-22 (premium - 20% markup)
      for (let hour = 18; hour < 22; hour += 2) {
        timeSlots.push(
          timeSlotRepository.create({
            courtId: court.id,
            dayOfWeek,
            startHour: hour,
            endHour: hour + 2,
            price: Math.round(court.pricePerHour * 1.2),
          }),
        );
      }
    }

    await timeSlotRepository.save(timeSlots);
    logger.log(`✓ Created ${timeSlots.length} time slots for court: ${court.name}`);
  }

  await dataSource.destroy();
  logger.log('Seed time slots completed');
}

seedTimeSlots().catch((err) => {
  logger.error('Seed time slots error:', err);
  process.exit(1);
});
