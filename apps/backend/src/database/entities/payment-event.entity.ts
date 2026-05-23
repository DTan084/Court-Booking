import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentEntity } from './payment.entity';

export enum PaymentEventDirection {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity('payment_events')
@Index('idx_payment_events_payment', ['paymentId', 'createdAt'])
export class PaymentEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId: string;

  @ManyToOne(() => PaymentEntity, (payment) => payment.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: PaymentEntity;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType: string;

  @Column({ type: 'enum', enum: PaymentEventDirection })
  direction: PaymentEventDirection;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'inet', name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'boolean', name: 'is_verified', nullable: true })
  isVerified: boolean | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
