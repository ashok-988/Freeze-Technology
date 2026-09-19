import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserQueryDto, AssignRoleDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto, @Req() req: any) {
    const actorUserId = req.user?.id;
    return this.usersService.createUser(dto, actorUserId);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    const actorUserId = req.user?.id;
    return this.usersService.updateUser(id, dto, actorUserId);
  }

  @Patch(':id/activate')
  async activateUser(@Param('id') id: string, @Req() req: any) {
    const actorUserId = req.user?.id;
    return this.usersService.activateUser(id, actorUserId);
  }

  @Patch(':id/deactivate')
  async deactivateUser(@Param('id') id: string, @Req() req: any) {
    const actorUserId = req.user?.id;
    return this.usersService.deactivateUser(id, actorUserId);
  }

  @Patch(':id/role')
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @Req() req: any,
  ) {
    const actorUserId = req.user?.id;
    return this.usersService.assignRole(id, dto.roleId, actorUserId);
  }

  @Get(':id/permissions')
  async getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }

  @Get(':id/activity')
  async getUserActivity(@Param('id') id: string) {
    return this.usersService.getUserActivity(id);
  }
}
