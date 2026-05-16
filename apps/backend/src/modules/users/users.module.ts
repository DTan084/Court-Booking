import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from '../../database/entities/user.entity';
import { BookingEntity } from '../../database/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, BookingEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
