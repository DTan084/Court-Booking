import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Role } from '@court-booking/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SettingsService } from './settings.service';

const updateSettingsSchema = z.object({
  defaultTimezone: z.string().min(3).max(60).optional(),
  currency: z.string().min(3).max(10).optional(),
  paymentDeadlineMinutes: z.number().int().min(5).max(180).optional(),
  cancelWithinHours: z.number().int().min(1).max(168).optional(),
  noCancelBeforeHours: z.number().int().min(1).max(168).optional(),
  analyticsStartHour: z.number().int().min(0).max(23).optional(),
  analyticsEndHour: z.number().int().min(1).max(24).optional(),
  profileUpdateCooldownDays: z.number().int().min(0).max(365).optional(),
});

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getAdminSettings();
  }

  @Patch()
  updateSettings(
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: z.infer<typeof updateSettingsSchema>,
  ) {
    return this.settingsService.updateAdminSettings(body);
  }
}

@Controller('settings')
export class RuntimeSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('runtime')
  getRuntimeSettings() {
    return this.settingsService.getRuntimeSettings();
  }
}
