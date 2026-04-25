// TODO: Court Entity
// - @Entity("courts")
// - Columns: id (UUID), name, sport_type, address, description, price_per_hour, is_active
// - @OneToMany(() => Booking, b => b.court)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('courts')
export class CourtEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'sport_type', length: 50 })
  sportType: string;

  @Column({ length: 500 })
  address: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'price_per_hour', type: 'decimal', precision: 10, scale: 2 })
  pricePerHour: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  // TODO: @OneToMany(() => BookingEntity, booking => booking.court)
  // bookings: BookingEntity[];
}
