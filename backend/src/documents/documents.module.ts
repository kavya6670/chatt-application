import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentProcessorService } from './document-processor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DocumentsService, DocumentProcessorService],
  controllers: [DocumentsController],
  exports: [DocumentsService, DocumentProcessorService],
})
export class DocumentsModule {}
