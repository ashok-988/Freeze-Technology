import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from './dto/role.dto';

@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  async getPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Get('roles/:id')
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.rolesService.createRole(dto, userId);
  }

  @Patch('roles/:id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.rolesService.updateRole(id, dto, userId);
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.rolesService.deleteRole(id, userId);
  }

  @Get('roles/:id/permissions')
  async getRolePermissions(@Param('id') id: string) {
    return this.rolesService.getRolePermissions(id);
  }

  @Put('roles/:id/permissions')
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.rolesService.updateRolePermissions(id, dto, userId);
  }
}
