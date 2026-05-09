import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { CourtEntity } from './court.entity';
import { BookingStatus } from '@court-booking/shared';

@Entity('bookings')
@Index(['courtId', 'startTime', 'status'])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index()
  @Column({ type: 'uuid', name: 'court_id' })
  courtId: string;

  @ManyToOne(() => UserEntity, (user) => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => CourtEntity, (court) => court.bookings)
  @JoinColumn({ name: 'court_id' })
  court: CourtEntity;

  @Index()
  @Column({ type: 'timestamp with time zone', name: 'start_time' })
  startTime: Date;

  @Index()
  @Column({ type: 'timestamp with time zone', name: 'end_time' })
  endTime: Date;

  @Index()
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING_PAYMENT })
  status: BookingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice: number;

  // Phase 2: Payment fields
  @Column({ type: 'timestamp with time zone', name: 'payment_deadline', nullable: true })
  paymentDeadline: Date | null;

  @Column({ type: 'timestamp with time zone', name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'payment_ref', nullable: true })
  paymentRef: string | null;

  @Column({ type: 'timestamp with time zone', name: 'expired_at', nullable: true })
  expiredAt: Date | null;

  @Column({ type: 'timestamp with time zone', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
