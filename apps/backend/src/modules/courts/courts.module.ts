import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { CourtImageEntity } from '../../database/entities/court-image.entity';
import { CourtFeatureEntity } from '../../database/entities/court-feature.entity';
import { FeatureEntity } from '../../database/entities/feature.entity';
import { SportTypeEntity } from '../../database/entities/sport-type.entity';
import { CourtsService } from './courts.service';
import { CourtsController } from './courts.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { RedisModule } from '../../common/redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourtEntity,
      CourtTimeSlotEntity,
      CourtImageEntity,
      CourtFeatureEntity,
      FeatureEntity,
      SportTypeEntity,
    ]),
    forwardRef(() => BookingsModule),
    RedisModule,
    NotificationsModule,
  ],
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}
