import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0', 10),
  queueDb: parseInt(process.env.REDIS_QUEUE_DB || '1', 10),
  queueKeyPrefix: process.env.REDIS_QUEUE_PREFIX || 'bull',
}));
