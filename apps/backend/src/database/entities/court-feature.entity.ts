import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourtEntity } from './court.entity';
import { FeatureEntity } from './feature.entity';

@Entity('court_features')
@Index(['courtId', 'featureId'], { unique: true })
export class CourtFeatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'court_id' })
  courtId: string;

  @ManyToOne(() => CourtEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'court_id' })
  court: CourtEntity;

  @Column({ type: 'uuid', name: 'feature_id' })
  featureId: string;

  @ManyToOne(() => FeatureEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feature_id' })
  feature: FeatureEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
