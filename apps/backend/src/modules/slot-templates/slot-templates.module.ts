import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlotTemplateEntity } from '../../database/entities/slot-template.entity';
import { SlotTemplateItemEntity } from '../../database/entities/slot-template-item.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { CourtEntity } from '../../database/entities/court.entity';
import { SlotTemplatesService } from './slot-templates.service';
import { SlotTemplatesController } from './slot-templates.controller';
import { CourtTemplateController } from './court-template.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SlotTemplateEntity,
      SlotTemplateItemEntity,
      CourtTimeSlotEntity,
      CourtEntity,
    ]),
  ],
  controllers: [SlotTemplatesController, CourtTemplateController],
  providers: [SlotTemplatesService],
})
export class SlotTemplatesModule {}
