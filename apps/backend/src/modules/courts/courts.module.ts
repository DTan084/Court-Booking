import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtsService } from './courts.service';
import { CourtsController } from './courts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CourtEntity])],
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}
