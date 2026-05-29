import { DataSource, DataSourceOptions } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CourtEntity } from './entities/court.entity';
import { CourtTimeSlotEntity } from './entities/court-time-slot.entity';
import { BookingEntity } from './entities/booking.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { CourtImageEntity } from './entities/court-image.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { FeatureEntity } from './entities/feature.entity';
import { CourtFeatureEntity } from './entities/court-feature.entity';
import { SlotTemplateEntity } from './entities/slot-template.entity';
import { SlotTemplateItemEntity } from './entities/slot-template-item.entity';
import { SystemSettingEntity } from './entities/system-setting.entity';
import { PaymentProviderEntity } from './entities/payment-provider.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentEventEntity } from './entities/payment-event.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root of monorepo (works for local dev)
// In Docker/production, env vars are injected directly
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'court_booking',
  entities: [
    UserEntity,
    CourtEntity,
    CourtImageEntity,
    CourtTimeSlotEntity,
    BookingEntity,
    RefreshTokenEntity,
    SportTypeEntity,
    FeatureEntity,
    CourtFeatureEntity,
    SlotTemplateEntity,
    SlotTemplateItemEntity,
    SystemSettingEntity,
    PaymentProviderEntity,
    PaymentEntity,
    PaymentEventEntity,
    path.join(__dirname, 'entities/notification.entity{.ts,.js}'),
  ],
  // Use .js in production (compiled), .ts in development
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
  migrationsTransactionMode: 'each',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
