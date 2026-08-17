import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { DocumentProcessorService } from '../documents/document-processor.service';
import axios from 'axios';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiAssistantService {
  private anthropicApiKey: string;
  private anthropicModel: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private documentProcessorService: DocumentProcessorService,
  ) {
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    this.anthropicModel = this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-3-sonnet-20240229';
  }

  async chat(userId: string, query: string, conversationId?: string) {
    // Get user's department for permission-aware retrieval
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Search for relevant documents based on user's department
    const relevantDocs = await this.documentProcessorService.searchSimilarDocuments(
      query,
      user.role === 'ADMIN' ? undefined : user.departmentId,
      5,
    );

    // Build context from relevant documents
    const context = relevantDocs
      .map((doc: any) => `From "${doc.documentTitle}": ${doc.content}`)
      .join('\n\n');

    // Build system prompt with context
    const systemPrompt = `You are a helpful AI assistant for a company's internal communication platform. 
You have access to company documents and can help answer questions based on them.
Always cite your sources when providing information from documents.
If you don't have relevant information in the context, say so and don't make up information.

Context from company documents:
${context || 'No relevant documents found.'}`;

    // Get conversation history if conversationId is provided
    let messages: ChatMessage[] = [];
    if (conversationId) {
      const conversation = await this.prisma.aIConversation.findUnique({
        where: { id: conversationId },
      });

      if (conversation && conversation.userId === userId) {
        // In a real implementation, you'd store full conversation history
        // For now, we'll just use the previous query/response
        messages = [
          { role: 'user' as const, content: conversation.query },
          { role: 'assistant' as const, content: conversation.response },
        ];
      }
    }

    // Add current query
    messages.push({ role: 'user' as const, content: query });

    // Call Anthropic API
    const response = await this.callAnthropicAPI(systemPrompt, messages);

    // Save conversation
    const savedConversation = await this.prisma.aIConversation.create({
      data: {
        userId,
        departmentId: user.departmentId,
        query,
        response: response.content,
        sources: relevantDocs.map((doc: any) => doc.id),
      },
    });

    return {
      response: response.content,
      sources: relevantDocs,
      conversationId: savedConversation.id,
    };
  }

  async getConversationHistory(userId: string, limit = 20) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new Error('You do not have access to this conversation');
    }

    return conversation;
  }

  private async callAnthropicAPI(systemPrompt: string, messages: ChatMessage[]) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.anthropicModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        },
        {
          headers: {
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        content: response.data.content[0].text,
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error('Failed to get AI response');
    }
  }
}
