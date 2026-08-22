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
    // 1. Get user's profile and department
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, role: true, name: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 2. Search for relevant knowledge base documents based on user's department
    const relevantDocs = await this.documentProcessorService.searchSimilarDocuments(
      query,
      user.role === 'ADMIN' ? undefined : user.departmentId,
      5,
    );

    const docsContext = relevantDocs
      .map((doc: any) => `[Knowledge Doc "${doc.documentTitle}"]: ${doc.content}`)
      .join('\n\n');

    // 3. Search and fetch user's direct messages and group chats
    // A. Fetch recent conversations
    const userConversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, employeeId: true } },
          },
        },
        messages: {
          take: 25,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    });

    // B. Perform keyword search across past messages in user's conversations
    const searchTerms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'what', 'did', 'who', 'when', 'how', 'any', 'for', 'with', 'from', 'about', 'chat', 'tell', 'show'].includes(w));

    let matchedHistoricalMessages: any[] = [];
    if (searchTerms.length > 0) {
      matchedHistoricalMessages = await this.prisma.message.findMany({
        where: {
          conversation: {
            participants: {
              some: { userId },
            },
          },
          OR: searchTerms.map((term) => ({
            content: { contains: term, mode: 'insensitive' },
          })),
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true } },
          conversation: {
            select: {
              id: true,
              type: true,
              name: true,
              participants: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });
    }

    const chatContextLines: string[] = [];
    userConversations.forEach((conv) => {
      const channelName =
        conv.type === 'GROUP'
          ? `Group Channel #${conv.name || 'general'}`
          : `1:1 Direct Chat with ${conv.participants.find((p) => p.userId !== userId)?.user?.name || 'Colleague'}`;

      const msgs = conv.messages.slice().reverse();
      if (msgs.length > 0) {
        chatContextLines.push(`--- Conversation: ${channelName} ---`);
        msgs.forEach((m) => {
          const timeStr = m.createdAt.toISOString().replace('T', ' ').slice(0, 16);
          chatContextLines.push(`[${timeStr}] ${m.sender.name}: ${m.content}`);
        });
      }
    });

    if (matchedHistoricalMessages.length > 0) {
      chatContextLines.push(`\n--- Relevant Search Results from Past Chats ---`);
      matchedHistoricalMessages.forEach((m) => {
        const convName = m.conversation?.type === 'GROUP'
          ? `#${m.conversation?.name || 'group'}`
          : `1:1 Chat`;
        const timeStr = m.createdAt.toISOString().replace('T', ' ').slice(0, 16);
        chatContextLines.push(`[${timeStr}] [${convName}] ${m.sender?.name}: ${m.content}`);
      });
    }

    const chatContext = chatContextLines.join('\n');

    // 4. Fetch user's Calendar Events
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 14);

    const calendarEvents = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lte: futureLimit },
      },
      orderBy: { startTime: 'asc' },
      take: 15,
    });

    const calendarContext = calendarEvents
      .map(
        (e) =>
          `- Event: "${e.title}" from ${e.startTime.toLocaleString()} to ${e.endTime.toLocaleString()} (Location: ${e.location || 'Online'})${e.description ? ` [Notes: ${e.description}]` : ''}`,
      )
      .join('\n');

    // 5. Build Comprehensive System Prompt
    const systemPrompt = `You are Stitch AI Assistant, the intelligent workspace and enterprise assistant for Stitch Enterprise Collab Hub.
You have direct access to:
1. Complete Previous and Recent Chat History (both 1-on-1 direct messages and group channels) that the user is part of.
2. Company Knowledge Documents and Policies.
3. User's Synced Calendar Events and Meetings.

Instructions:
- When the user asks any question about previous conversations, what a teammate said, updates on projects, links/files shared, decisions made, or scheduled meetings, CAREFULLY SEARCH the provided chat logs below.
- Always quote or reference the speaker, conversation channel, timestamp, and message context clearly.
- If information is found in chat, synthesize it clearly and concisely.
- If asked about meetings, check both calendar events and discussions in employee chats.

=== CONTEXT FROM EMPLOYEE CHATS (1-ON-1 & GROUP) ===
${chatContext || 'No recent chat messages found.'}

=== CONTEXT FROM USER'S CALENDAR ===
${calendarContext || 'No calendar events scheduled in the upcoming window.'}

=== CONTEXT FROM KNOWLEDGE BASE DOCUMENTS ===
${docsContext || 'No relevant knowledge documents found.'}`;

    // Get conversation history if conversationId is provided
    let messages: ChatMessage[] = [];
    if (conversationId) {
      const conversation = await this.prisma.aIConversation.findUnique({
        where: { id: conversationId },
      });

      if (conversation && conversation.userId === userId) {
        messages = [
          { role: 'user' as const, content: conversation.query },
          { role: 'assistant' as const, content: conversation.response },
        ];
      }
    }

    // Add current query
    messages.push({ role: 'user' as const, content: query });

    // Call Groq API or Fallback Reasoning
    const response = await this.callGroqAPI(systemPrompt, messages, userId, {
      userConversations,
      calendarEvents,
    });

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

  private async generateMockResponse(
    query: string,
    userId: string,
    extraContext?: { userConversations?: any[]; calendarEvents?: any[] },
  ): Promise<string> {
    const q = query.toLowerCase();

    // 1. Meeting & Calendar queries
    const isMeetingQuery =
      q.includes('meeting') ||
      q.includes('schedule') ||
      q.includes('calendar') ||
      q.includes('sync') ||
      q.includes('standup') ||
      q.includes('appointment') ||
      q.includes('today') ||
      q.includes('tomorrow');

    if (isMeetingQuery) {
      const now = new Date();
      const calendarEvents =
        extraContext?.calendarEvents ||
        (await this.prisma.calendarEvent.findMany({
          where: {
            userId,
            startTime: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { startTime: 'asc' },
          take: 10,
        }));

      // Scan user's chat messages for mentioned meetings
      const conversations =
        extraContext?.userConversations ||
        (await this.prisma.conversation.findMany({
          where: { participants: { some: { userId } } },
          include: {
            messages: {
              take: 20,
              orderBy: { createdAt: 'desc' },
              include: { sender: { select: { name: true } } },
            },
          },
        }));

      const meetingKeywords = ['meet', 'meeting', 'sync', 'standup', 'call', 'retro', 'planning', 'catch up', 'huddle'];
      const chatMeetingMentions: { channel: string; sender: string; content: string; time: string }[] = [];

      conversations.forEach((conv: any) => {
        const chName = conv.type === 'GROUP' ? `#${conv.name || 'Group Chat'}` : '1:1 Direct Chat';
        conv.messages?.forEach((msg: any) => {
          const mLower = msg.content.toLowerCase();
          if (meetingKeywords.some((kw) => mLower.includes(kw))) {
            chatMeetingMentions.push({
              channel: chName,
              sender: msg.sender?.name || 'Colleague',
              content: msg.content,
              time: new Date(msg.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            });
          }
        });
      });

      let responseText = `### 📅 Meeting & Schedule Intelligence Report\n\n`;

      if (calendarEvents.length > 0) {
        responseText += `**Scheduled on Your Calendar:**\n`;
        calendarEvents.forEach((ev: any) => {
          const start = new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const end = new Date(ev.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = new Date(ev.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
          responseText += `- **${ev.title}** (${dateStr} • ${start} - ${end})\n  *Location/Details:* ${ev.location || 'Virtual / Stitch Call'}\n`;
        });
        responseText += `\n`;
      } else {
        responseText += `You have no calendar meetings currently recorded for today.\n\n`;
      }

      if (chatMeetingMentions.length > 0) {
        responseText += `**Meetings Discussed in Employee Chats:**\n`;
        chatMeetingMentions.slice(0, 4).forEach((m) => {
          responseText += `- **${m.sender}** in *${m.channel}* (${m.time}):\n  > "${m.content}"\n  ✅ *This has been automatically captured and synced to your calendar.*\n\n`;
        });
      } else {
        responseText += `I also scanned your 1:1 and group chats, and found no other pending meeting requests or discussions.`;
      }

      return responseText;
    }

    // 2. Chat history / teammate message inquiry or questions about conversations
    // Search messages in user's conversations for keywords or user mentions
    const cleanWords = q
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'what', 'did', 'who', 'when', 'how', 'any', 'for', 'with', 'from', 'about', 'tell', 'show', 'please'].includes(w));

    let matchedMsgs: any[] = [];
    if (cleanWords.length > 0) {
      matchedMsgs = await this.prisma.message.findMany({
        where: {
          conversation: {
            participants: { some: { userId } },
          },
          OR: [
            ...cleanWords.map((word) => ({ content: { contains: word, mode: 'insensitive' as const } })),
            ...cleanWords.map((word) => ({ sender: { name: { contains: word, mode: 'insensitive' as const } } })),
          ],
        },
        include: {
          sender: { select: { name: true } },
          conversation: { select: { type: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });
    }

    if (matchedMsgs.length > 0) {
      let reply = `### 💬 Intelligence from Your Past Chat Discussions\n\n`;
      reply += `Based on your previous chats matching **"${query}"**:\n\n`;
      matchedMsgs.forEach((m) => {
        const ch = m.conversation?.type === 'GROUP' ? `#${m.conversation?.name || 'group'}` : '1:1 Direct Chat';
        const time = new Date(m.createdAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        reply += `- **${m.sender?.name || 'Colleague'}** in *${ch}* (${time}):\n  > "${m.content}"\n\n`;
      });
      return reply;
    }

    if (q.includes('chat') || q.includes('talk') || q.includes('said') || q.includes('discuss') || q.includes('message')) {
      const conversations =
        extraContext?.userConversations ||
        (await this.prisma.conversation.findMany({
          where: { participants: { some: { userId } } },
          include: {
            messages: {
              take: 10,
              orderBy: { createdAt: 'desc' },
              include: { sender: { select: { name: true } } },
            },
          },
        }));

      let reply = `Here is a summary of your recent 1-on-1 and group chat discussions:\n\n`;
      let foundMessages = 0;

      conversations.forEach((conv: any) => {
        const title = conv.type === 'GROUP' ? `Group Channel #${conv.name || 'general'}` : '1:1 Direct Chat';
        const msgs = conv.messages || [];
        if (msgs.length > 0) {
          reply += `**${title}**:\n`;
          msgs.slice(0, 3).forEach((m: any) => {
            reply += `- **${m.sender?.name || 'Colleague'}**: "${m.content}"\n`;
            foundMessages++;
          });
          reply += `\n`;
        }
      });

      if (foundMessages === 0) {
        return `You have no recent messages across your 1-on-1 or group chats. Send a message in **Chat** to collaborate with team members!`;
      }

      return reply;
    }

    // 3. Greetings
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('greet')) {
      return `Hello! I am your Stitch Enterprise AI Assistant.\n\nI continuously connect to your **1-on-1 and group chats**, **calendar schedule**, and **company documents**.\n\nYou can ask me:\n- *"What did my team discuss in our group chat?"*\n- *"What did Sarah say about the project?"*\n- *"Is there any meeting scheduled or mentioned in chat?"*\n- *"Search documents for engineering guidelines"*`;
    }

    // 4. Deployment info
    if (q.includes('deploy') || q.includes('build') || q.includes('stack') || q.includes('setup')) {
      return `The **Stitch Enterprise Collab Hub** stack consists of:
- **Frontend**: Next.js 14 + Tailwind CSS + Lucide Icons + LiveKit/WebRTC Client
- **Backend**: NestJS + Socket.io + Prisma ORM + PostgreSQL
- **Intelligence**: Integrated meeting detector, Chat-Aware AI Assistant, and Vector Search

To start both servers locally:
1. Backend: \`npm run start:dev\`
2. Frontend: \`npm run dev\``;
    }

    // 5. General Fallback
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { department: { select: { name: true } } },
    });

    return `I searched your previous chats and **${user?.department?.name || 'General'}** documents for: "${query}".\n\nI didn't find a direct keyword match in your past messages. You can ask me specific questions about recent conversations, team discussions, scheduled meetings, or company policies!`;
  }

  private async callGroqAPI(
    systemPrompt: string,
    messages: ChatMessage[],
    userId?: string,
    extraContext?: { userConversations?: any[]; calendarEvents?: any[] },
  ) {
    if (!this.groqApiKey || this.groqApiKey === 'mock-anthropic-key') {
      const lastMessage = messages[messages.length - 1]?.content || '';
      const mockReply = await this.generateMockResponse(lastMessage, userId || '', extraContext);
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
      } catch (error: any) {
        console.warn(`Groq API attempt with model "${model}" failed:`, error.response?.data?.error?.message || error.message);
      }
    }

    const lastMessage = messages[messages.length - 1]?.content || '';
    const mockReply = await this.generateMockResponse(lastMessage, userId || '', extraContext);
    return {
      content: mockReply,
    };
  }
}
