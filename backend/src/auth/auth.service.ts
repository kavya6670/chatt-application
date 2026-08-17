import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';

interface LoginDto {
  employeeId: string;
  password: string;
}

interface RegisterDto {
  employeeId: string;
  email: string;
  name: string;
  password: string;
  role: Role;
  departmentId: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(employeeId: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmployeeId(employeeId);
    
    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.employeeId, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid employee ID or password');
    }

    // Check if user must reset password
    if (user.mustResetPassword) {
      const token = this.jwtService.sign({
        sub: user.id,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        mustResetPassword: true,
      });

      return {
        access_token: token,
        mustResetPassword: true,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
        },
      };
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const payload = {
      sub: user.id,
      employeeId: user.employeeId,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      mustResetPassword: false,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
      },
    };
  }

  async resetPassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
    await this.usersService.setMustResetPassword(userId, false);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
  }

  generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  generateEmployeeId(department: string): string {
    const prefix = department.substring(0, 3).toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}${random}`;
  }
}
