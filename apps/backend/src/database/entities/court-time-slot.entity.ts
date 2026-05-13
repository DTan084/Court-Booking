import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourtEntity } from './court.entity';

export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 0,
}

@Entity('court_time_slots')
@Index(['courtId', 'dayOfWeek'])
export class CourtTimeSlotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'court_id' })
  courtId: string;

  @ManyToOne(() => CourtEntity, (court) => court.timeSlots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'court_id' })
  court: CourtEntity;

  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches JS Date.getDay())
  @Column({ type: 'smallint', name: 'day_of_week' })
  dayOfWeek: DayOfWeek;

  // e.g. 6 = 06:00, 8 = 08:00, 22 = 22:00
  @Column({ type: 'smallint', name: 'start_hour' })
  startHour: number;

  @Column({ type: 'smallint', name: 'end_hour' })
  endHour: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'uuid', name: 'template_id', nullable: true })
  templateId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
