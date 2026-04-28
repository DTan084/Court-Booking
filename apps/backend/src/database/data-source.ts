import { DataSource, DataSourceOptions } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CourtEntity } from './entities/court.entity';
import { BookingEntity } from './entities/booking.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root of monorepo
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'court_booking',
  entities: [UserEntity, CourtEntity, BookingEntity, RefreshTokenEntity],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
