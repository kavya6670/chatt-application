import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface CreateDocumentDto {
  title: string;
  description?: string;
  departmentId?: string;
  file: Express.Multer.File;
}

interface UpdateDocumentDto {
  title?: string;
  description?: string;
  departmentId?: string;
}

@Injectable()
export class DocumentsService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';
    const port = this.configService.get<string>('MINIO_PORT') || '9000';
    const useSsl = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const protocol = useSsl ? 'https' : 'http';

    this.s3Client = new S3Client({
      endpoint: `${protocol}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
        secretAccessKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
      },
      forcePathStyle: true,
    });
    this.bucketName = this.configService.get<string>('MINIO_BUCKET') || 'stitch-files';
  }

  async getDocuments(userId: string, departmentId?: string) {
    const where: any = {};
    
    if (departmentId) {
      where.departmentId = departmentId;
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true, role: true },
      });
      
      if (user?.role !== 'ADMIN') {
        where.departmentId = user?.departmentId;
      }
    }

    return this.prisma.document.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getDocumentById(documentId: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        department: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, role: true },
    });

    if (user?.role !== 'ADMIN' && document.departmentId !== user?.departmentId) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return document;
  }

  async createDocument(userId: string, createDocumentDto: CreateDocumentDto) {
    const { title, description, departmentId, file } = createDocumentDto;

    const fileName = `${Date.now()}-${file.originalname}`;
    const key = `documents/${fileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (s3Err) {
      console.warn('S3/MinIO upload failed (using local metadata fallback):', s3Err.message);
    }

    const document = await this.prisma.document.create({
      data: {
        title,
        description,
        fileName: file.originalname,
        filename: fileName,
        originalName: file.originalname,
        fileKey: key,
        fileSize: file.size,
        size: file.size,
        mimeType: file.mimetype,
        storagePath: key,
        departmentId: departmentId || undefined,
        uploadedById: userId,
        status: 'COMPLETED',
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
    });

    return document;
  }

  async updateDocument(documentId: string, userId: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.getDocumentById(documentId, userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && document.uploadedById !== userId) {
      throw new ForbiddenException('You do not have permission to update this document');
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: updateDocumentDto,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
    });
  }

  async deleteDocument(documentId: string, userId: string) {
    const document = await this.getDocumentById(documentId, userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && document.uploadedById !== userId) {
      throw new ForbiddenException('You do not have permission to delete this document');
    }

    try {
      if (document.fileKey) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: document.fileKey,
          }),
        );
      }
    } catch (s3Err) {
      console.warn('S3 file deletion failed:', s3Err.message);
    }

    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { success: true };
  }

  async getDownloadUrl(documentId: string, userId: string) {
    const document = await this.getDocumentById(documentId, userId);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: document.fileKey || document.storagePath || '',
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return { url, fileName: document.fileName || document.originalName };
    } catch {
      return { url: '#', fileName: document.fileName || document.originalName };
    }
  }

  async getDocumentChunks(documentId: string, userId: string) {
    await this.getDocumentById(documentId, userId);

    return this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: {
        chunkIndex: 'asc',
      },
    });
  }
}
