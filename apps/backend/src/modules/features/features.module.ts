import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureEntity } from '../../database/entities/feature.entity';
import { CourtFeatureEntity } from '../../database/entities/court-feature.entity';
import { CourtEntity } from '../../database/entities/court.entity';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureEntity, CourtFeatureEntity, CourtEntity])],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
