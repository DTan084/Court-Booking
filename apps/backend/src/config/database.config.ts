import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  name: process.env.DB_NAME || 'court_booking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Connection pooling for better performance
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  maxQueryExecutionTime: parseInt(process.env.DB_MAX_QUERY_TIME || '5000', 10), // 5s
  logging: process.env.DB_LOGGING === 'true',
  synchronize: process.env.DB_SYNCHRONIZE === 'true', // Should be false in production
}));
