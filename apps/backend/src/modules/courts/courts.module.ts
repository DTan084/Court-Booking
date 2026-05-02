import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtsService } from './courts.service';
import { CourtsController } from './courts.controller';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [TypeOrmModule.forFeature([CourtEntity]), forwardRef(() => BookingsModule)],
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}
