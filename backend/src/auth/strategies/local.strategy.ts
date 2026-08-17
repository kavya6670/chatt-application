import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'employeeId',
      passwordField: 'password',
    });
  }

  async validate(employeeId: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(employeeId, password);
    if (!user) {
      throw new UnauthorizedException('Invalid employee ID or password');
    }
    return user;
  }
}
