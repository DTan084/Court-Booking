import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SystemSettingEntity } from '../../database/entities/system-setting.entity';

const SETTING_DEFAULTS = {
  default_timezone: 'Asia/Ho_Chi_Minh',
  currency: 'VND',
  payment_deadline_minutes: '30',
  cancel_within_hours: '24',
  no_cancel_before_hours: '12',
  analytics_start_hour: '6',
  analytics_end_hour: '22',
} as const;

export type AdminSettingsDto = {
  defaultTimezone: string;
  currency: string;
  paymentDeadlineMinutes: number;
  cancelWithinHours: number;
  noCancelBeforeHours: number;
  analyticsStartHour: number;
  analyticsEndHour: number;
};

export type RuntimeSettingsDto = {
  defaultTimezone: string;
  currency: string;
  paymentDeadlineMinutes: number;
  cancelWithinHours: number;
  noCancelBeforeHours: number;
  analyticsStartHour: number;
  analyticsEndHour: number;
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepo: Repository<SystemSettingEntity>,
  ) {}

  private parseIntSafe(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async getRawValues(keys: string[]): Promise<Record<string, string>> {
    const found = await this.settingRepo.find({
      where: { key: In(keys) },
    });
    const map: Record<string, string> = {};
    for (const key of keys) {
      map[key] =
        found.find((x) => x.key === key)?.value ??
        SETTING_DEFAULTS[key as keyof typeof SETTING_DEFAULTS] ??
        '';
    }
    return map;
  }

  async getNumber(key: keyof typeof SETTING_DEFAULTS, fallback: number): Promise<number> {
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

    return this.getAdminSettings();
  }

  async getRuntimeSettings(): Promise<RuntimeSettingsDto> {
    return this.getAdminSettings();
  }
}
