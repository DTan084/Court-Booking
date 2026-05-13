import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('court_features')
@Index(['courtId', 'featureId'], { unique: true })
export class CourtFeatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'court_id' })
  courtId: string;

  @Column({ type: 'uuid', name: 'feature_id' })
  featureId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
