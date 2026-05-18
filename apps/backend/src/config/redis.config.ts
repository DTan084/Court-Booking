import { registerAs } from '@nestjs/config';

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  username: process.env.REDIS_USERNAME || '',
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0', 10),
  appKeyPrefix: process.env.REDIS_APP_PREFIX || 'cb:',
  tlsEnabled: parseBoolean(process.env.REDIS_TLS_ENABLED, false),
  connectTimeoutMs: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '2000', 10),
  commandTimeoutMs: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '2000', 10),
  enableOfflineQueue: parseBoolean(process.env.REDIS_ENABLE_OFFLINE_QUEUE, false),
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST || '1', 10),
  queueDb: parseInt(process.env.REDIS_QUEUE_DB || '1', 10),
  queueKeyPrefix: process.env.REDIS_QUEUE_PREFIX || 'bull',
  queueEnableOfflineQueue: parseBoolean(process.env.REDIS_QUEUE_ENABLE_OFFLINE_QUEUE, true),
}));
