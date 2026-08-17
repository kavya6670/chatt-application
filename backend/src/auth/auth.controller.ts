import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  async resetPassword(@Request() req, @Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(req.user.sub, resetPasswordDto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.sub, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    return {
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    // With JWT, logout is handled client-side by removing the token
    // This endpoint exists for future session management if needed
    return { message: 'Logged out successfully' };
  }
}
