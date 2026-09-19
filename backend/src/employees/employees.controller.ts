import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll(@Query() query: EmployeeQueryDto) {
    const data = await this.employeesService.findAll(query);
    return {
      success: true,
      data,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.employeesService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('technicians')
  async getTechnicians() {
    const data = await this.employeesService.getTechnicians();
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.employeesService.findById(id);
    return {
      success: true,
      data,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    const data = await this.employeesService.create(createEmployeeDto);
    return {
      success: true,
      message: 'Employee created successfully.',
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const data = await this.employeesService.update(id, updateEmployeeDto);
    return {
      success: true,
      message: 'Employee updated successfully.',
      data,
    };
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    return await this.employeesService.deactivate(id);
  }
}
