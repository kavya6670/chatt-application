import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { ChatModule } from './chat/chat.module';
import { CallsModule } from './calls/calls.module';
import { CalendarModule } from './calendar/calendar.module';
import { DocumentsModule } from './documents/documents.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    ChatModule,
    CallsModule,
    CalendarModule,
    DocumentsModule,
    AiAssistantModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
