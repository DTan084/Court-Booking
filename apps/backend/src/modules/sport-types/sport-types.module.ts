import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportTypeEntity } from '../../database/entities/sport-type.entity';
import { CourtEntity } from '../../database/entities/court.entity';
import { SportTypesService } from './sport-types.service';
import { SportTypesController } from './sport-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SportTypeEntity, CourtEntity])],
  providers: [SportTypesService],
  controllers: [SportTypesController],
  exports: [SportTypesService],
})
export class SportTypesModule {}
