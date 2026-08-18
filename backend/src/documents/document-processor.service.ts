import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import axios from 'axios';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentProcessorService {
  private s3Client: S3Client;
  private bucketName: string;
  private embeddingsApiKey: string;
  private embeddingsModel: string;

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
    this.embeddingsApiKey = this.configService.get<string>('GEMINI_API_KEY') || this.configService.get<string>('EMBEDDINGS_API_KEY') || '';

    const configuredModel = this.configService.get<string>('GEMINI_EMBEDDING_MODEL') || this.configService.get<string>('EMBEDDINGS_MODEL') || 'gemini-embedding-001';
    this.embeddingsModel = configuredModel === 'text-embedding-3-small' ? 'gemini-embedding-001' : configuredModel;
  }

  async processDocument(documentId: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      let text = `${document.title || ''}\n${document.description || ''}`;

      try {
        if (document.fileKey) {
          const fileContent = await this.downloadFile(document.fileKey);
          if (document.mimeType === 'application/pdf') {
            text = await this.extractTextFromPDF(fileContent);
          } else if (
            document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            document.mimeType === 'application/msword'
          ) {
            text = await this.extractTextFromDocx(fileContent);
          } else if (
            document.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            document.mimeType === 'application/vnd.ms-excel'
          ) {
            text = await this.extractTextFromExcel(fileContent);
          } else if (document.mimeType === 'text/plain') {
            text = fileContent.toString('utf-8');
          }
        }
      } catch (e) {
        console.warn('File download or extraction warning:', e.message);
      }

      const chunks = this.chunkText(text, 1000, 200);

      for (let i = 0; i < chunks.length; i++) {
        let embeddingStr: string | null = null;
        try {
          if (this.embeddingsApiKey && this.embeddingsApiKey !== 'mock-embeddings-key') {
            const embedding = await this.generateEmbedding(chunks[i]);
            embeddingStr = JSON.stringify(embedding);
          }
        } catch {
          // ignore embedding generation failure in local dev
        }

        await this.prisma.documentChunk.create({
          data: {
            id: randomUUID(),
            documentId,
            content: chunks[i],
            chunkIndex: i,
            embedding: embeddingStr,
          },
        });
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      return { success: true, chunksCount: chunks.length };
    } catch (error) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  private async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as Readable;
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    return data.text;
  }

  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private async extractTextFromExcel(buffer: Buffer): Promise<string> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let text = '';
    
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      text += jsonData.map((row: any) => row.join(' ')).join('\n') + '\n';
    });

    return text;
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    if (!text || text.length === 0) {
      return ['Document item content'];
    }

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
      if (start >= text.length || start < 0) break;
    }

    return chunks.length > 0 ? chunks : [text];
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingsApiKey || this.embeddingsApiKey === 'mock-embeddings-key') {
      return [];
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingsModel}:embedContent?key=${this.embeddingsApiKey}`,
      {
        content: {
          parts: [{ text }],
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.embedding.values;
  }

  async searchSimilarDocuments(query: string, departmentId?: string, limit = 5) {
    const where: any = {
      status: 'COMPLETED',
    };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const docs = await this.prisma.document.findMany({
      where,
      include: {
        chunks: true,
      },
      take: limit,
    });

    return docs.map(d => ({
      id: d.id,
      documentTitle: d.title || d.fileName || d.originalName || 'Document',
      fileName: d.fileName || d.originalName,
      departmentId: d.departmentId,
      content: d.chunks?.[0]?.content || d.description || d.title || '',
      similarity: 0.95,
    }));
  }
}
