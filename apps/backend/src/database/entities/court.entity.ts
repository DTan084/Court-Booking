import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { CourtTimeSlotEntity } from './court-time-slot.entity';
import { CourtType } from '@court-booking/shared';
import { CourtImageEntity } from './court-image.entity';
import { SportTypeEntity } from './sport-type.entity';

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

  @Index('idx_courts_sport_type_id')
  @Column({ type: 'uuid', name: 'sport_type_id' })
  sportTypeId: string;

  @ManyToOne(() => SportTypeEntity)
  @JoinColumn({ name: 'sport_type_id' })
  sportTypeRef: SportTypeEntity;

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

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;

  @OneToMany(() => BookingEntity, (booking) => booking.court)
  bookings: BookingEntity[];

  @OneToMany(() => CourtTimeSlotEntity, (slot) => slot.court, { cascade: true })
  timeSlots: CourtTimeSlotEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
