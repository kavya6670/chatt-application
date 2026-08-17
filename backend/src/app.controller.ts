import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot() {
    return {
      name: 'Stitch Enterprise Collaboration Hub API',
      version: '1.0.0',
      status: 'online',
      healthCheck: '/health',
      docs: '/api-docs',
    };
  }
}
