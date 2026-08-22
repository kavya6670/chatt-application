import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

class CreateUserDto {
  employeeId: string;
  email: string;
  name: string;
  password: string;
  role: Role;
  departmentId: string;
}

class UpdateUserDto {
  email?: string;
  name?: string;
  role?: Role;
  departmentId?: string;
  isActive?: boolean;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(@Request() req) {
    const user = await this.usersService.findById(req.user.sub);
    const { passwordHash, ...result } = user;
    return result;
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(
    @Query('departmentId') departmentId?: string,
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      departmentId,
      role,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return { message: 'User not found' };
    }
    const { passwordHash, ...result } = user;
    return result;
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { passwordHash, ...result } = user;
    return result;
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    const { passwordHash, ...result } = user;
    return result;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    await this.usersService.delete(id);
    return { message: 'User deleted successfully' };
  }

  @Post(':id/reset-password')
  @Roles(Role.ADMIN)
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password?: string },
  ) {
    return this.usersService.adminResetPassword(id, body?.password);
  }

  @Post(':id/deactivate')
  @Roles(Role.ADMIN)
  async deactivate(@Param('id') id: string) {
    await this.usersService.deactivate(id);
    return { message: 'User deactivated successfully' };
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  async activate(@Param('id') id: string) {
    await this.usersService.activate(id);
    return { message: 'User activated successfully' };
  }
}
