'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { aiAssistantApi } from '@/lib/ai-assistant-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Send, Bot, FileText, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

export default function AIAssistantPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await aiAssistantApi.chat({
        query: userMessage,
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
          content: 'I checked your workspace documents but encountered an error connecting to our deep reasoning model. Please verify your internet connection or ask about your schedule for today.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
                Query enterprise documents, policies, or get your personal schedule for today
              </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden border border-border bg-card rounded-2xl shadow-sm">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-8">
                <div className="max-w-md space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#6D4C5B]/10 flex items-center justify-center text-[#6D4C5B] dark:text-[#D98C9A] mx-auto mb-2">
                    <Bot className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Welcome to Stitch AI Assistant
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Ask me anything about company documents, policies, or procedures.
                    I search our secure knowledge repository to provide contextual, cited answers.
                    You can also ask <strong>&quot;what is my schedule today?&quot;</strong> to view your events.
                  </p>
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
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words font-medium">
                          {message.content.split('\n').map((line, i) => (
                            <p key={i} className="mb-2 last:mb-0">{line}</p>
                          ))}
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
                placeholder="Ask a question about documents or your calendar..."
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
