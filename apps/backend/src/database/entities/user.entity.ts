// TODO: User Entity
// - @Entity("users")
// - Columns: id (UUID), name, email, password_hash, phone, role, created_at, updated_at, deleted_at
// - @OneToMany(() => Booking, b => b.user)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ default: 'user' })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  // TODO: @OneToMany(() => BookingEntity, booking => booking.user)
  // bookings: BookingEntity[];
}
