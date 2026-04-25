// TODO: Booking Entity
// - @Entity("bookings")
// - Columns: id (UUID), court_id, user_id, start_time, end_time, status, total_price
// - @ManyToOne(() => User), @ManyToOne(() => Court)
// - Index: idx_bookings_court_time

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

@Entity('bookings')
@Index('idx_bookings_court_time', ['courtId', 'startTime', 'endTime'])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'court_id' })
  courtId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ default: 'confirmed' })
  status: string;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // TODO: @ManyToOne(() => UserEntity, user => user.bookings)
  // @JoinColumn({ name: 'user_id' })
  // user: UserEntity;

  // TODO: @ManyToOne(() => CourtEntity, court => court.bookings)
  // @JoinColumn({ name: 'court_id' })
  // court: CourtEntity;
}
