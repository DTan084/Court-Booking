import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('slot_template_items')
@Index(['templateId', 'dayOfWeek', 'startHour'], { unique: true })
export class SlotTemplateItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'template_id' })
  templateId: string;

  @Column({ type: 'smallint', name: 'day_of_week' })
  dayOfWeek: number;

  @Column({ type: 'time', name: 'start_hour' })
  startHour: string;

  @Column({ type: 'time', name: 'end_hour' })
  endHour: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;
}
