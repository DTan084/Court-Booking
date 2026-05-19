import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSettingEntity } from '../../database/entities/system-setting.entity';
import { RuntimeSettingsController, SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSettingEntity])],
  controllers: [SettingsController, RuntimeSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
