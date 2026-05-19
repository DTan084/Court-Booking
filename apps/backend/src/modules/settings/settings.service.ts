import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Redis from 'ioredis';
import { SystemSettingEntity } from '../../database/entities/system-setting.entity';

const SETTING_DEFAULTS = {
  default_timezone: 'Asia/Ho_Chi_Minh',
  currency: 'VND',
  payment_deadline_minutes: '30',
  cancel_within_hours: '24',
  no_cancel_before_hours: '12',
  analytics_start_hour: '6',
  analytics_end_hour: '22',
  profile_update_cooldown_days: '30',
} as const;

export type AdminSettingsDto = {
  defaultTimezone: string;
  currency: string;
  paymentDeadlineMinutes: number;
  cancelWithinHours: number;
  noCancelBeforeHours: number;
  analyticsStartHour: number;
  analyticsEndHour: number;
  profileUpdateCooldownDays: number;
};

export type RuntimeSettingsDto = {
  defaultTimezone: string;
  currency: string;
  paymentDeadlineMinutes: number;
  cancelWithinHours: number;
  noCancelBeforeHours: number;
  analyticsStartHour: number;
  analyticsEndHour: number;
  profileUpdateCooldownDays: number;
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly ALL_DEFAULT_SETTINGS_CACHE_KEY = 'settings:defaults:all';

  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepo: Repository<SystemSettingEntity>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private async safeCacheGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      this.logger.warn(`Redis get failed for settings cache key "${key}"`);
      return null;
    }
  }

  private async safeCacheSet(key: string, value: unknown): Promise<void> {
    try {
      await this.redis.setex(key, this.CACHE_TTL_SECONDS, JSON.stringify(value));
    } catch {
      this.logger.warn(`Redis set failed for settings cache key "${key}"`);
    }
  }

  private async safeCacheDel(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      this.logger.warn(`Redis delete failed for settings cache key "${key}"`);
    }
  }

  private async getDefaultSettingsValuesCached(): Promise<Record<string, string>> {
    const cached = await this.safeCacheGet(this.ALL_DEFAULT_SETTINGS_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as Record<string, string>;
      } catch {
        await this.safeCacheDel(this.ALL_DEFAULT_SETTINGS_CACHE_KEY);
      }
    }

    const defaultKeys = Object.keys(SETTING_DEFAULTS);
    const found = await this.settingRepo.find({
      where: { key: In(defaultKeys) },
    });

    const values: Record<string, string> = {};
    for (const key of defaultKeys) {
      values[key] =
        found.find((item) => item.key === key)?.value ??
        SETTING_DEFAULTS[key as keyof typeof SETTING_DEFAULTS] ??
        '';
    }

    await this.safeCacheSet(this.ALL_DEFAULT_SETTINGS_CACHE_KEY, values);
    return values;
  }

  private parseIntSafe(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async getRawValues(keys: string[]): Promise<Record<string, string>> {
    const map: Record<string, string> = {};

    const defaultSettingKeys = keys.filter(
      (key): key is keyof typeof SETTING_DEFAULTS => key in SETTING_DEFAULTS,
    );
    const customKeys = keys.filter((key) => !(key in SETTING_DEFAULTS));

    if (defaultSettingKeys.length > 0) {
      const cachedDefaults = await this.getDefaultSettingsValuesCached();
      for (const key of defaultSettingKeys) {
        map[key] = cachedDefaults[key] ?? SETTING_DEFAULTS[key] ?? '';
      }
    }

    if (customKeys.length > 0) {
      const found = await this.settingRepo.find({
        where: { key: In(customKeys) },
      });
      for (const key of customKeys) {
        map[key] = found.find((item) => item.key === key)?.value ?? '';
      }
    }

    return map;
  }

  async getNumber(key: keyof typeof SETTING_DEFAULTS | string, fallback: number): Promise<number> {
    const values = await this.getRawValues([key]);
    return this.parseIntSafe(values[key], fallback);
  }

  async getAdminSettings(): Promise<AdminSettingsDto> {
    const values = await this.getRawValues(Object.keys(SETTING_DEFAULTS));
    return {
      defaultTimezone: values.default_timezone,
      currency: values.currency,
      paymentDeadlineMinutes: this.parseIntSafe(values.payment_deadline_minutes, 30),
      cancelWithinHours: this.parseIntSafe(values.cancel_within_hours, 24),
      noCancelBeforeHours: this.parseIntSafe(values.no_cancel_before_hours, 12),
      analyticsStartHour: this.parseIntSafe(values.analytics_start_hour, 6),
      analyticsEndHour: this.parseIntSafe(values.analytics_end_hour, 22),
      profileUpdateCooldownDays: this.parseIntSafe(values.profile_update_cooldown_days, 30),
    };
  }

  async updateAdminSettings(payload: Partial<AdminSettingsDto>): Promise<AdminSettingsDto> {
    if (
      payload.analyticsStartHour !== undefined &&
      payload.analyticsEndHour !== undefined &&
      payload.analyticsEndHour <= payload.analyticsStartHour
    ) {
      throw new BadRequestException('Analytics end hour must be greater than start hour');
    }

    const entries: Array<[string, string | number | boolean | undefined]> = [
      ['default_timezone', payload.defaultTimezone],
      ['currency', payload.currency],
      ['payment_deadline_minutes', payload.paymentDeadlineMinutes],
      ['cancel_within_hours', payload.cancelWithinHours],
      ['no_cancel_before_hours', payload.noCancelBeforeHours],
      ['analytics_start_hour', payload.analyticsStartHour],
      ['analytics_end_hour', payload.analyticsEndHour],
      ['profile_update_cooldown_days', payload.profileUpdateCooldownDays],
    ];

    for (const [key, value] of entries) {
      if (value === undefined) continue;
      const existing = await this.settingRepo.findOne({ where: { key } });
      if (existing) {
        existing.value = String(value);
        await this.settingRepo.save(existing);
      } else {
        await this.settingRepo.save(this.settingRepo.create({ key, value: String(value) }));
      }
    }

    await this.safeCacheDel(this.ALL_DEFAULT_SETTINGS_CACHE_KEY);
    return this.getAdminSettings();
  }

  async getRuntimeSettings(): Promise<RuntimeSettingsDto> {
    return this.getAdminSettings();
  }
}
