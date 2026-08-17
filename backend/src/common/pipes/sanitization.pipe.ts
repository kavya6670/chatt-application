import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  async transform(value: any) {
    if (typeof value === 'string') {
      // Basic XSS prevention
      return value
        .replace(/[<>]/g, '') // Remove < and >
        .trim();
    }
    
    if (typeof value === 'object' && value !== null) {
      // Recursively sanitize object properties
      const sanitized = { ...value };
      for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = sanitized[key].replace(/[<>]/g, '').trim();
        }
      }
      return sanitized;
    }

    return value;
  }
}
