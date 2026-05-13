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
import { SportType, CourtType, FacilityFeature } from '@court-booking/shared';
import { CourtImageEntity } from './court-image.entity';

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

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Index({ where: 'deleted_at IS NULL' })
  @Column({ type: 'enum', enum: CourtType, default: CourtType.OUTDOOR, name: 'court_type' })
  courtType: CourtType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index('idx_courts_features_gin')
  @Column({ type: 'text', array: true, nullable: false, default: () => "'{}'" })
  features: FacilityFeature[];

  @OneToMany(() => CourtImageEntity, (img) => img.court, { cascade: true, eager: false })
  images: CourtImageEntity[];

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_hour' })
  pricePerHour: number;

  @Column({ type: 'enum', enum: CourtStatus, default: CourtStatus.ACTIVE })
  status: CourtStatus;

  @Index('idx_courts_is_featured')
  @Column({ type: 'boolean', name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ type: 'integer', name: 'max_players', nullable: true })
  maxPlayers: number | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @OneToMany(() => BookingEntity, (booking) => booking.court)
  bookings: BookingEntity[];

  @OneToMany(() => CourtTimeSlotEntity, (slot) => slot.court, { cascade: true })
  timeSlots: CourtTimeSlotEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
