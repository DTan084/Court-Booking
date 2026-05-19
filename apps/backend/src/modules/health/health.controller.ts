import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheck,
  MemoryHealthIndicator,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private redis: RedisHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check system health' })
  check() {
    const indicators: HealthIndicatorFunction[] = [
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
    ];

    if (this.configService.get<string>('NODE_ENV') !== 'test') {
      indicators.push(() => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024));
    }

    return this.health.check(indicators);
  }
}
