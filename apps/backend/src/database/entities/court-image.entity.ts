import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CourtEntity } from './court.entity';

@Entity('court_images')
@Index('idx_court_images_court_id', ['courtId', 'displayOrder'])
export class CourtImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'court_id', type: 'uuid' })
  courtId: string;

  @ManyToOne(() => CourtEntity, (court) => court.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'court_id' })
  court: CourtEntity;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ name: 'alt_text', type: 'varchar', length: 200, nullable: true })
  altText: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
