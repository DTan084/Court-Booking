import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { PaymentProviderEntity } from './payment-provider.entity';
import { PaymentEventEntity } from './payment-event.entity';
import { UserEntity } from './user.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  RECONCILING = 'RECONCILING',
}

@Entity('payments')
@Index(['bookingId'])
@Index(['providerCode', 'status'])
@Index(['providerTxnId'], { where: '"provider_txn_id" IS NOT NULL' })
@Index(['providerCode', 'providerTxnId'], {
  where: '"provider_txn_id" IS NOT NULL',
  unique: true,
})
@Index(['providerCode', 'providerOrderId'], { unique: true })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => BookingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  @Column({ type: 'varchar', length: 20, name: 'provider_code' })
  providerCode: string;

  @ManyToOne(() => PaymentProviderEntity, (provider) => provider.payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'provider_code', referencedColumnName: 'code' })
  provider: PaymentProviderEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'char', length: 3, default: 'VND' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'amount_in_usd', nullable: true })
  // Optional FX snapshot for non-VND providers; currently unused in VNPay-only scope.
  amountInUsd: number | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 200, name: 'provider_txn_id', nullable: true })
  providerTxnId: string | null;

  @Column({ type: 'varchar', length: 200, name: 'provider_order_id', nullable: true })
  providerOrderId: string | null;

  @Column({ type: 'varchar', length: 200, name: 'provider_ref_code', nullable: true })
  // Optional provider-side reference code; not required for VNPay core flow.
  providerRefCode: string | null;

  @Column({ type: 'jsonb', name: 'provider_raw', nullable: true })
  providerRaw: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', name: 'initiated_at', default: () => 'now()' })
  initiatedAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'refunded_at', nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'refund_amount', nullable: true })
  refundAmount: number | null;

  @Column({ type: 'uuid', name: 'initiated_by', nullable: true })
  initiatedBy: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'initiated_by' })
  initiatedByUser: UserEntity | null;

  @OneToMany(() => PaymentEventEntity, (event) => event.payment)
  events: PaymentEventEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
