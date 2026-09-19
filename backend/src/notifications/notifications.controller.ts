import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Query() query: NotificationQueryDto, @Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.findAll(query, userId);
    return { success: true, ...data };
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.getStats(userId);
    return { success: true, data };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.getUnreadCount(userId);
    return { success: true, ...data };
  }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.getPreferences(userId);
    return { success: true, data };
  }

  @Patch('preferences')
  async updatePreferences(@Body() dto: UpdatePreferencesDto, @Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.updatePreferences(dto, userId);
    return { success: true, data, message: 'Notification preferences updated successfully.' };
  }

  @Post('evaluate-rules')
  async evaluateRules(@Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.evaluateAutomatedRules(userId);
    return data;
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.markAllAsRead(userId);
    return data;
  }

  @Patch('archive-all')
  async archiveAll(@Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.archiveAll(userId);
    return data;
  }

  @Post()
  async create(@Body() dto: CreateNotificationDto, @Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.create(dto, userId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.findById(id, userId);
    return { success: true, data };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.markAsRead(id, userId);
    return { success: true, data, message: 'Notification marked as read.' };
  }

  @Patch(':id/unread')
  async markAsUnread(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.markAsUnread(id, userId);
    return { success: true, data, message: 'Notification marked as unread.' };
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.archive(id, userId);
    return { success: true, data, message: 'Notification archived.' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.id;
    const data = await this.notificationsService.remove(id, userId);
    return data;
  }
}
