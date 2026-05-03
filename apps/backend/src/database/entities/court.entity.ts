import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { CourtTimeSlotEntity } from './court-time-slot.entity';
import { SportType } from '@court-booking/shared';

export enum CourtStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('courts')
export class CourtEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index()
  @Column({ type: 'enum', enum: SportType })
  sportType: SportType;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_hour' })
  pricePerHour: number;

  @Column({ type: 'enum', enum: CourtStatus, default: CourtStatus.ACTIVE })
  status: CourtStatus;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(() => BookingEntity, (booking) => booking.court)
  bookings: BookingEntity[];

  @OneToMany(() => CourtTimeSlotEntity, (slot) => slot.court, { cascade: true })
  timeSlots: CourtTimeSlotEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
