import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  UpdateCompanySettingsDto,
  UpdateSystemSettingDto,
  AuditLogQueryDto,
} from './dto/settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  async getCompanySettings() {
    return this.settingsService.getCompanySettings();
  }

  @Patch('company')
  async updateCompanySettings(
    @Body() dto: UpdateCompanySettingsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.settingsService.updateCompanySettings(dto, userId);
  }

  @Get('system')
  async getAllSystemSettings() {
    return this.settingsService.getAllSystemSettings();
  }

  @Get('system/:category')
  async getSystemSettingsByCategory(@Param('category') category: string) {
    return this.settingsService.getSystemSettingsByCategory(category);
  }

  @Patch('system/:key')
  async updateSystemSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSystemSettingDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.settingsService.updateSystemSetting(key, dto, userId);
  }

  @Get('audit-logs')
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.settingsService.getAuditLogs(query);
  }

  @Get('diagnostics')
  async getSystemDiagnostics() {
    return this.settingsService.getSystemDiagnostics();
  }
}
