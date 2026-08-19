'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { chatApi, Conversation, Message } from '@/lib/chat-api';
import { usersApi } from '@/lib/users-api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Send, Plus, Search, MoreVertical, Phone, Video, Info, FileText, MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const targetUserId = searchParams.get('userId');

  useEffect(() => {
    loadConversations();
    
    if (targetUserId) {
      startDirectConversation(targetUserId);
    }

    const socket = getSocket();
    if (socket) {
      socket.on('message:new', handleNewMessage);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);
      socket.on('messages:read', handleMessagesRead);
    }

    return () => {
      if (socket) {
        socket.off('message:new', handleNewMessage);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);
        socket.off('messages:read', handleMessagesRead);
      }
    };
  }, [targetUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await chatApi.getConversations();
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startDirectConversation = async (userId: string) => {
    try {
      const res = await chatApi.createConversation({
        type: 'DIRECT' as any,
        participantIds: [userId],
      });
      setSelectedConversation(res.data);
      loadMessages(res.data.id);
      loadConversations();
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await chatApi.getMessages(conversationId);
      setMessages(res.data);
      
      const socket = getSocket();
      if (socket) {
        socket.emit('join:conversation', { conversationId });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleNewMessage = (message: Message) => {
    if (selectedConversation && message.conversationId === selectedConversation.id) {
      setMessages((prev) => [...prev, message]);
    }
    loadConversations();
  };

  const handleTypingStart = (data: { userId: string; conversationId: string }) => {
    console.log('User typing:', data);
  };

  const handleTypingStop = (data: { userId: string; conversationId: string }) => {
    console.log('User stopped typing:', data);
  };

  const handleMessagesRead = (data: { userId: string; conversationId: string }) => {
    console.log('Messages read:', data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const res = await chatApi.sendMessage({
        conversationId: selectedConversation.id,
        content: newMessage,
      });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
      
      await chatApi.markAsRead(selectedConversation.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSearchUsers = async (term: string) => {
    if (!term) {
      setFilteredUsers([]);
      return;
    }

    try {
      const res = await usersApi.getAllUsers({ search: term, isActive: true });
      setFilteredUsers(res.data.filter((u: any) => u.id !== user?.id));
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupMembers.length === 0) {
      alert('Please enter a group name and select at least one member');
      return;
    }

    try {
      const res = await chatApi.createConversation({
        type: 'GROUP' as any,
        name: groupName,
        participantIds: selectedGroupMembers,
      });
      setSelectedConversation(res.data);
      loadMessages(res.data.id);
      loadConversations();
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedGroupMembers([]);
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    }
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#6D4C5B] border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6.5rem)] bg-background border border-border rounded-2xl overflow-hidden flex shadow-md transition-colors duration-200">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-sidebar border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Messages</h2>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateGroup(!showCreateGroup)}
                className="text-xs border-border bg-card hover:bg-[#E8DCE0] dark:hover:bg-[#352B30] text-foreground h-8 px-2.5 rounded-lg"
              >
                Create Group
              </Button>
              <Button
                size="sm"
                onClick={() => setShowNewChat(!showNewChat)}
                className="bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white w-8 h-8 p-0 rounded-lg flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search/New Chat */}
          {showNewChat && (
            <div className="relative animate-in slide-in-from-top duration-150">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users to chat..."
                className="pl-10 text-xs h-9 bg-input border-border focus:border-[#A66A7A]"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
              />
              {filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-xl mt-1.5 max-h-56 overflow-y-auto z-20 shadow-lg p-1.5 space-y-1">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-lg hover:bg-sidebar cursor-pointer transition-colors text-xs flex items-center justify-between"
                      onClick={() => {
                        startDirectConversation(u.id);
                        setShowNewChat(false);
                        setSearchTerm('');
                        setFilteredUsers([]);
                      }}
                    >
                      <div>
                        <div className="font-semibold text-foreground">{u.name}</div>
                        <div className="text-[10px] text-muted-foreground">{u.employeeId}</div>
                      </div>
                      <span className="text-[9px] bg-[#6D4C5B]/10 text-[#6D4C5B] dark:text-[#E8B6BF] px-1.5 py-0.5 rounded font-medium capitalize">
                        {u.department?.name || 'Staff'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Group Creator Panel */}
          {showCreateGroup && (
            <div className="p-3 bg-card border border-border rounded-xl space-y-2 animate-in slide-in-from-top duration-150">
              <Input
                placeholder="Group name"
                className="text-xs h-8 bg-input border-border focus:border-[#A66A7A]"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <Input
                placeholder="Search team members..."
                className="text-xs h-8 bg-input border-border focus:border-[#A66A7A]"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
              />
              {selectedGroupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {filteredUsers
                    .filter((u) => selectedGroupMembers.includes(u.id))
                    .map((u) => (
                      <span
                        key={u.id}
                        className="bg-[#6D4C5B]/10 border border-[#6D4C5B]/20 text-[#6D4C5B] dark:text-[#E8B6BF] px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 font-semibold"
                      >
                        {u.name}
                        <button
                          onClick={() => toggleGroupMember(u.id)}
                          className="hover:text-red-500 font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              )}
              {filteredUsers.length > 0 && (
                <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-1 bg-background space-y-0.5">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`p-1.5 rounded hover:bg-sidebar cursor-pointer flex items-center gap-2 text-xs transition-colors ${
                        selectedGroupMembers.includes(u.id) ? 'bg-[#6D4C5B]/5' : ''
                      }`}
                      onClick={() => toggleGroupMember(u.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroupMembers.includes(u.id)}
                        onChange={() => toggleGroupMember(u.id)}
                        className="rounded border-border text-[#6D4C5B] focus:ring-[#A66A7A] w-3 h-3 cursor-pointer pointer-events-none"
                      />
                      <span className="text-foreground font-medium">{u.name}</span>
                      <span className="text-[10px] text-muted-foreground">({u.employeeId})</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5 pt-1">
                <Button onClick={handleCreateGroup} className="flex-1 bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white text-xs h-8 rounded-lg" size="sm">
                  Create Group
                </Button>
                <Button variant="outline" onClick={() => { setShowCreateGroup(false); setGroupName(''); setSelectedGroupMembers([]); }} className="text-xs h-8 rounded-lg border-border" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {conversations.map((conv) => {
            const isSelected = selectedConversation?.id === conv.id;
            const displayName = conv.type === 'DIRECT'
              ? conv.participants.find((p) => p.userId !== user?.id)?.user.name
              : conv.name;
            const lastMsg = conv.messages?.[0]?.content || 'No messages yet';

            return (
              <div
                key={conv.id}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-150 border-l-4 ${
                  isSelected
                    ? 'bg-[#E3D2D8] dark:bg-[#6D4C5B]/20 border-[#6D4C5B] text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-[#E8DCE0] dark:hover:bg-[#352B30] hover:text-foreground'
                }`}
                onClick={() => {
                  setSelectedConversation(conv);
                  loadMessages(conv.id);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6D4C5B] to-[#A66A7A] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {displayName?.charAt(0) || 'G'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-foreground truncate">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {lastMsg}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[#6D4C5B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {conversations.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No conversations active.
            </div>
          )}
        </div>
      </div>

      {/* Center Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-background border-b border-border px-6 py-3 flex items-center justify-between h-14 shrink-0 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="md:hidden p-1 hover:bg-sidebar text-muted-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6D4C5B] to-[#A66A7A] flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(selectedConversation.type === 'DIRECT'
                    ? selectedConversation.participants.find((p) => p.userId !== user?.id)?.user.name
                    : selectedConversation.name
                  )?.charAt(0) || 'G'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-foreground truncate">
                    {selectedConversation.type === 'DIRECT'
                      ? selectedConversation.participants.find((p) => p.userId !== user?.id)?.user.name
                      : selectedConversation.name}
                  </h3>
                  <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5F8F72] inline-block" />
                    {selectedConversation.participants.length} participants
                  </p>
                </div>
              </div>

              {/* Actions Header */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0 text-muted-foreground">
                  <Video className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className={`h-8 w-8 p-0 text-[#6D4C5B] dark:text-[#D98C9A] hover:bg-sidebar ${showRightPanel ? 'bg-[#E3D2D8] dark:bg-[#6D4C5B]/20' : ''}`}
                >
                  <Info className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
              {messages.map((message) => {
                const isOwn = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in-50 duration-200`}
                  >
                    {!isOwn && (
                      <div className="w-7 h-7 rounded-full bg-[#6D4C5B]/15 text-[#6D4C5B] dark:text-[#D98C9A] flex items-center justify-center font-bold text-[10px] shrink-0 mb-1">
                        {message.sender.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col space-y-0.5 max-w-[70%]">
                      {!isOwn && (
                        <span className="text-[10px] font-semibold text-muted-foreground ml-1.5">
                          {message.sender.name}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                          isOwn
                            ? 'bg-[#6D4C5B] text-white rounded-br-none shadow-sm'
                            : 'bg-[#E9DDE1] text-[#302A2D] dark:bg-[#352B30] dark:text-[#F4ECEF] rounded-bl-none border border-border/40'
                        }`}
                      >
                        <div className="break-words font-medium">{message.content}</div>
                        <div className={`text-[9px] text-right mt-1.5 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <div className="bg-background border-t border-border p-4 shrink-0 transition-colors">
              <div className="flex items-center gap-2 max-w-5xl mx-auto">
                <Input
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSending}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground/60 text-xs focus:border-[#A66A7A] focus:ring-[#A66A7A]/20 rounded-xl h-10 flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="bg-[#6D4C5B] hover:bg-[#5B3D4A] active:bg-[#4D323E] text-white rounded-xl w-10 h-10 p-0 shadow-md shrink-0 flex items-center justify-center transition-all"
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 bg-background">
            <Card className="max-w-sm border-border bg-card text-center p-6 rounded-2xl shadow-sm">
              <CardHeader className="p-0 pb-3 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#6D4C5B]/10 flex items-center justify-center text-[#6D4C5B] mb-2">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Select a conversation</h3>
              </CardHeader>
              <CardContent className="p-0 text-xs text-muted-foreground leading-relaxed">
                Choose a conversation from the left sidebar panel or start a direct discussion with a colleague using the search action.
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Right Info Panel */}
      {selectedConversation && showRightPanel && (
        <div className="w-72 bg-card border-l border-border flex flex-col overflow-y-auto hidden lg:flex animate-in slide-in-from-right duration-200 shrink-0">
          <div className="p-6 flex flex-col items-center text-center border-b border-border">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6D4C5B] to-[#A66A7A] flex items-center justify-center text-white font-bold text-xl mb-3 shadow-md">
              {(selectedConversation.type === 'DIRECT'
                ? selectedConversation.participants.find((p) => p.userId !== user?.id)?.user.name
                : selectedConversation.name
              )?.charAt(0) || 'G'}
            </div>
            <h4 className="font-bold text-foreground text-sm truncate w-full px-2">
              {selectedConversation.type === 'DIRECT'
                ? selectedConversation.participants.find((p) => p.userId !== user?.id)?.user.name
                : selectedConversation.name}
            </h4>
            <p className="text-[10px] text-[#A66A7A] font-semibold mt-0.5 capitalize tracking-wide">
              {selectedConversation.type.toLowerCase()} conversation
            </p>
          </div>

          <div className="p-4 space-y-5">
            {/* About */}
            <div>
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">About</h5>
              <p className="text-xs text-foreground leading-relaxed">
                {selectedConversation.type === 'DIRECT'
                  ? `Private chat channel. All communications are secure.`
                  : `General group space. Post sync messages and share deliverables.`}
              </p>
            </div>

            {/* Members */}
            <div>
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Participants ({selectedConversation.participants.length})
              </h5>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedConversation.participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs py-1 hover:bg-sidebar/40 rounded transition-colors px-1">
                    <div className="w-6 h-6 rounded-full bg-[#6D4C5B]/10 text-[#6D4C5B] dark:text-[#E8B6BF] flex items-center justify-center font-bold text-[9px] uppercase">
                      {p.user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-[11px]">{p.user.name}</p>
                      <p className="text-[8px] text-muted-foreground uppercase">{((p.user as any).role ?? 'member').toLowerCase()}</p>
                    </div>
                    {p.user.id === user?.id && (
                      <span className="text-[8px] bg-sidebar text-muted-foreground px-1 py-0.2 rounded border border-border">You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Files Mock */}
            <div>
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Shared Files</h5>
              <div className="space-y-1.5">
                <div className="p-2 rounded-xl bg-background border border-border flex items-center gap-2 hover:bg-[#E8DCE0] dark:hover:bg-[#352B30] cursor-pointer transition-all">
                  <FileText className="w-4 h-4 text-[#6D4C5B] shrink-0" />
                  <div className="flex-1 min-w-0 text-[10px]">
                    <p className="font-semibold text-foreground truncate">architecture_plan.pdf</p>
                    <p className="text-muted-foreground text-[9px]">1.4 MB • PDF Document</p>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-background border border-border flex items-center gap-2 hover:bg-[#E8DCE0] dark:hover:bg-[#352B30] cursor-pointer transition-all">
                  <FileText className="w-4 h-4 text-[#A66A7A] shrink-0" />
                  <div className="flex-1 min-w-0 text-[10px]">
                    <p className="font-semibold text-foreground truncate">sprint_q3_milestones.xlsx</p>
                    <p className="text-muted-foreground text-[9px]">840 KB • Excel Sheet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
