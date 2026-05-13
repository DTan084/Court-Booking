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
import { BookingStatus, BookingSource, CancelledBy } from '@court-booking/shared';

@Entity('bookings')
@Index(['courtId', 'startTime', 'status'])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

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

  @Column({ type: 'varchar', name: 'payment_method', nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'varchar', name: 'payment_ref', nullable: true })
  paymentRef: string | null;

  @Column({ type: 'timestamp with time zone', name: 'expired_at', nullable: true })
  expiredAt: Date | null;

  @Column({ type: 'timestamp with time zone', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date | null;

  @Index()
  @Column({
    type: 'enum',
    enum: BookingSource,
    name: 'booking_source',
    default: BookingSource.ONLINE,
  })
  bookingSource: BookingSource;

  @Column({ type: 'varchar', length: 20, name: 'transaction_id', nullable: true, unique: true })
  transactionId: string | null;

  @Column({ type: 'timestamp with time zone', name: 'checked_in_at', nullable: true })
  checkedInAt: Date | null;

  @Column({ type: 'varchar', length: 100, name: 'guest_name', nullable: true })
  guestName: string | null;

  @Column({ type: 'varchar', length: 20, name: 'guest_phone', nullable: true })
  guestPhone: string | null;

  @Column({ type: 'text', name: 'note', nullable: true })
  note: string | null;

  @Column({ type: 'enum', enum: CancelledBy, name: 'cancelled_by', nullable: true })
  cancelledBy: CancelledBy | null;

  @Column({ type: 'varchar', length: 100, name: 'cancelled_reason', nullable: true })
  cancelledReason: string | null;

  @Column({ type: 'text', name: 'cancellation_note', nullable: true })
  cancellationNote: string | null;

  @Column({ type: 'timestamp with time zone', name: 'refunded_at', nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'refund_amount', nullable: true })
  refundAmount: number | null;

  @Column({ type: 'boolean', name: 'payment_reminder_sent', default: false })
  paymentReminderSent: boolean;

  @Column({ type: 'boolean', name: 'booking_reminder_sent', default: false })
  bookingReminderSent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
