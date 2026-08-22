'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { aiAssistantApi } from '@/lib/ai-assistant-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Send, Bot, FileText, Loader2, Sparkles, MessageSquare, Calendar } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

export default function AIAssistantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialPromptHandled = useRef(false);

  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    if (promptParam && !initialPromptHandled.current) {
      initialPromptHandled.current = true;
      executePrompt(promptParam);
    }
  }, [searchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const executePrompt = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: promptText }]);
    setIsLoading(true);

    try {
      const res = await aiAssistantApi.chat({
        query: promptText,
        conversationId: conversationId || undefined,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.response,
          sources: res.data.sources,
        },
      ]);
      setConversationId(res.data.conversationId);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I checked your workspace documents, chats, and calendar but encountered a temporary connection issue. Please verify your connection or try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    executePrompt(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    {
      title: 'Is there any meeting?',
      desc: 'Checks calendar & chat discussions',
      icon: Calendar,
    },
    {
      title: 'What was discussed in team chats today?',
      desc: 'Summarizes 1:1 and group messages',
      icon: MessageSquare,
    },
    {
      title: 'What is my schedule for today?',
      desc: 'Lists today’s upcoming events',
      icon: Sparkles,
    },
    {
      title: 'What are the company deployment steps?',
      desc: 'Queries knowledge base documents',
      icon: FileText,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background text-foreground transition-colors duration-200">
      <div className="max-w-4xl mx-auto h-[calc(100vh-9.5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="border-border bg-card hover:bg-sidebar text-foreground h-9 px-3 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#6D4C5B] dark:text-[#D98C9A]" />
                AI Workspace Assistant
              </h1>
              <p className="text-muted-foreground text-xs">
                Connected to your 1-on-1 chats, group channels, calendar schedules, and knowledge base
              </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden border border-border bg-card rounded-2xl shadow-sm">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#6D4C5B]/10 flex items-center justify-center text-[#6D4C5B] dark:text-[#D98C9A] mb-3">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">
                  Stitch Intelligence Assistant
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed mb-6">
                  I scan your 1-on-1 direct messages, group chats, calendar schedule, and enterprise documents to give you unified answers.
                </p>

                {/* Prompt Suggestions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                  {suggestedPrompts.map((p, idx) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => executePrompt(p.title)}
                        className="p-3 rounded-xl border border-border bg-background/60 hover:bg-background hover:border-[#6D4C5B]/40 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-3.5 h-3.5 text-[#6D4C5B] dark:text-[#D98C9A]" />
                          <span className="text-xs font-semibold text-foreground group-hover:text-[#6D4C5B] dark:group-hover:text-[#D98C9A] transition-colors">
                            {p.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-end gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-[#6D4C5B]/10 text-[#6D4C5B] dark:text-[#D98C9A] flex items-center justify-center font-bold text-xs shrink-0 mb-1">
                        AI
                      </div>
                    )}
                    <div className="flex flex-col space-y-0.5 max-w-[75%]">
                      {message.role === 'assistant' && (
                        <span className="text-[10px] font-semibold text-muted-foreground ml-1.5">
                          AI Assistant
                        </span>
                      )}
                      <div
                        className={`rounded-2xl p-4 text-xs leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-[#6D4C5B] text-white rounded-br-none shadow-sm font-medium'
                            : 'bg-[#E9DDE1] text-[#302A2D] dark:bg-[#352B30] dark:text-[#F4ECEF] rounded-bl-none border border-border/40'
                        }`}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words font-medium whitespace-pre-wrap">
                          {message.content}
                        </div>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              Sources & References
                            </div>
                            <div className="space-y-1">
                              {message.sources.map((source: any, i) => (
                                <div
                                  key={i}
                                  className="text-[10px] bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground truncate"
                                >
                                  {source.documentTitle || 'Document Source'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-end gap-2.5 justify-start">
                    <div className="w-8 h-8 rounded-full bg-[#6D4C5B]/10 text-[#6D4C5B] dark:text-[#D98C9A] flex items-center justify-center font-bold text-xs shrink-0">
                      AI
                    </div>
                    <div className="bg-[#E9DDE1] dark:bg-[#352B30] border border-border/40 rounded-2xl rounded-bl-none p-4">
                      <Loader2 className="w-4 h-4 animate-spin text-[#6D4C5B] dark:text-[#D98C9A]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-sidebar/30">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <Input
                placeholder="Ask about meetings, chat conversations, schedule, or documents..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground/60 text-xs focus:border-[#A66A7A] focus:ring-[#A66A7A]/20 rounded-xl h-10"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-[#6D4C5B] hover:bg-[#5B3D4A] active:bg-[#4D323E] text-white rounded-xl w-10 h-10 p-0 shadow-md flex items-center justify-center shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
