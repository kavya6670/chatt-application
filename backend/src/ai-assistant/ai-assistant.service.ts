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
  private groqApiKey: string;
  private groqModel: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private documentProcessorService: DocumentProcessorService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    const configuredModel = this.configService.get<string>('GROQ_MODEL') || 'openai/gpt-oss-120b';
    this.groqModel = configuredModel === 'llama-3.1-8b-instant' ? 'openai/gpt-oss-120b' : configuredModel;
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

    // Call Groq API
    const response = await this.callGroqAPI(systemPrompt, messages, userId);

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

  private async generateMockResponse(query: string, userId: string): Promise<string> {
    const q = query.toLowerCase();

    // 1. Calendar/Schedule/Meeting check
    if (q.includes('schedule') || q.includes('meeting') || q.includes('calendar') || q.includes('today') || q.includes('appointment')) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const events = await this.prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      if (events.length === 0) {
        return `I checked your calendar for today and found no scheduled meetings or events. You're all clear! Let me know if you would like me to help schedule one.`;
      }

      const eventList = events
        .map(
          (e) =>
            `- **${e.title}**: ${e.startTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })} - ${e.endTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })} ${e.location ? `at *${e.location}*` : ''}`,
        )
        .join('\n');

      return `Here is your schedule for today:\n\n${eventList}\n\nLet me know if you need details on any of these meetings.`;
    }

    // 2. Greetings
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('greet')) {
      return `Hello! I am your Stitch Enterprise AI Assistant. How can I help you today?\n\nYou can ask me about:\n- Your schedule for today\n- Company documents or guidelines\n- The details of team departments\n- Deployment steps and stack details`;
    }

    // 3. Deployment information
    if (q.includes('deploy') || q.includes('build') || q.includes('stack') || q.includes('setup')) {
      return `The **Stitch Enterprise Collab Hub** stack consists of:
- **Frontend**: Next.js 14 + Tailwind CSS + Lucide Icons + shadcn/ui
- **Backend**: NestJS + Socket.io for real-time WebSocket communication
- **Database**: PostgreSQL managed via Prisma ORM
- **AI/RAG Services**: Anthropic Claude & Vector search support

To deploy the platform locally, verify that PostgreSQL is running on port 5432, run \`npx prisma db push\` and \`npx prisma db seed\` in the backend, then start both \`npm run start:dev\` (backend) and \`npm run dev\` (frontend).`;
    }

    // 4. Default context fallback
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { department: { select: { name: true } } },
    });

    return `I received your query: "${query}".\n\nI have searched the enterprise knowledge base for the **${user?.department?.name || 'General'}** department. You can ask me questions about company policies, documents, or ask "what is my schedule today?".`;
  }

  private async callGroqAPI(systemPrompt: string, messages: ChatMessage[], userId?: string) {
    if (!this.groqApiKey || this.groqApiKey === 'mock-anthropic-key') {
      const lastMessage = messages[messages.length - 1]?.content || '';
      const mockReply = await this.generateMockResponse(lastMessage, userId || '');
      return {
        content: mockReply,
      };
    }

    const candidateModels = [
      this.groqModel,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.6-27b',
    ];

    const groqMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    for (const model of Array.from(new Set(candidateModels))) {
      try {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model,
            max_tokens: 1024,
            messages: groqMessages,
          },
          {
            headers: {
              Authorization: `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        );

        if (response.data?.choices?.[0]?.message?.content) {
          return {
            content: response.data.choices[0].message.content,
          };
        }
      } catch (error) {
        console.warn(`Groq API attempt with model "${model}" failed:`, error.response?.data?.error?.message || error.message);
      }
    }

    const lastMessage = messages[messages.length - 1]?.content || '';
    const mockReply = await this.generateMockResponse(lastMessage, userId || '');
    return {
      content: mockReply,
    };
  }
}
