import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentProcessorService } from './document-processor.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

class CreateDocumentDto {
  title: string;
  description?: string;
  departmentId?: string;
}

class UpdateDocumentDto {
  title?: string;
  description?: string;
  departmentId?: string;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private documentProcessorService: DocumentProcessorService,
  ) {}

  @Get()
  async getDocuments(@Request() req, @Query('departmentId') departmentId?: string) {
    return this.documentsService.getDocuments(req.user.sub, departmentId);
  }

  @Get(':id')
  async getDocument(@Param('id') id: string, @Request() req) {
    return this.documentsService.getDocumentById(id, req.user.sub);
  }

  @Get(':id/download')
  async getDownloadUrl(@Param('id') id: string, @Request() req) {
    return this.documentsService.getDownloadUrl(id, req.user.sub);
  }

  @Get(':id/chunks')
  async getDocumentChunks(@Param('id') id: string, @Request() req) {
    return this.documentsService.getDocumentChunks(id, req.user.sub);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async createDocument(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    if (!file) {
      throw new Error('File is required');
    }
    return this.documentsService.createDocument(req.user.sub, {
      ...createDocumentDto,
      file,
    });
  }

  @Put(':id')
  async updateDocument(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(id, req.user.sub, updateDocumentDto);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @Request() req) {
    return this.documentsService.deleteDocument(id, req.user.sub);
  }

  @Post(':id/process')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async processDocument(@Param('id') id: string) {
    return this.documentProcessorService.processDocument(id);
  }

  @Get('search/similar')
  async searchSimilarDocuments(
    @Request() req,
    @Query('query') query: string,
    @Query('departmentId') departmentId?: string,
    @Query('limit') limit = '5',
  ) {
    return this.documentProcessorService.searchSimilarDocuments(
      query,
      departmentId,
      parseInt(limit),
    );
  }
}
