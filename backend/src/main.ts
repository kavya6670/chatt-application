import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ThrottleMiddleware } from './common/guards/throttle.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('BACKEND_PORT') || 3001;
  
  // Enable CORS for frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Apply rate limiting middleware
  const throttleMiddleware = new ThrottleMiddleware();
  app.use((req, res, next) => throttleMiddleware.use(req, res, next));

  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}

bootstrap();
