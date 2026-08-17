'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { chatApi, Conversation, Message } from '@/lib/chat-api';
import { usersApi } from '@/lib/users-api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Send, Plus, Search, MoreVertical, Phone, Video } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const targetUserId = searchParams.get('userId');

  useEffect(() => {
    loadConversations();
    
    // If userId is provided, start a direct conversation
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
      
      // Join the conversation room
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
    // Handle typing indicator
    console.log('User typing:', data);
  };

  const handleTypingStop = (data: { userId: string; conversationId: string }) => {
    // Handle typing indicator
    console.log('User stopped typing:', data);
  };

  const handleMessagesRead = (data: { userId: string; conversationId: string }) => {
    // Handle read receipt
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
      
      // Mark as read
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex h-screen">
        {/* Sidebar - Conversations List */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Messages</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCreateGroup(!showCreateGroup)}>
                  Create Group
                </Button>
                <Button size="sm" onClick={() => setShowNewChat(!showNewChat)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {showNewChat && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                />
                {filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-60 overflow-y-auto z-10">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => {
                          startDirectConversation(u.id);
                          setShowNewChat(false);
                          setSearchTerm('');
                          setFilteredUsers([]);
                        }}
                      >
                        <div className="font-medium">{u.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{u.employeeId}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {showCreateGroup && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <Input
                  placeholder="Group name"
                  className="mb-2"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <Input
                  placeholder="Search members..."
                  className="mb-2"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                />
                {selectedGroupMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {filteredUsers
                      .filter((u) => selectedGroupMembers.includes(u.id))
                      .map((u) => (
                        <span
                          key={u.id}
                          className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                        >
                          {u.name}
                          <button
                            onClick={() => toggleGroupMember(u.id)}
                            className="hover:text-blue-600 dark:hover:text-blue-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                )}
                {filteredUsers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-2 ${
                          selectedGroupMembers.includes(u.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                        onClick={() => toggleGroupMember(u.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupMembers.includes(u.id)}
                          onChange={() => toggleGroupMember(u.id)}
                          className="pointer-events-none"
                        />
                        <span>{u.name}</span>
                        <span className="text-sm text-gray-500">({u.employeeId})</span>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={handleCreateGroup} className="w-full mt-2" size="sm">
                  Create Group
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => {
                  setSelectedConversation(conv);
                  loadMessages(conv.id);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {conv.type === 'DIRECT'
                      ? conv.participants.find((p) => p.userId !== user?.id)?.user.name.charAt(0)
                      : conv.name?.charAt(0) || 'G'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {conv.type === 'DIRECT'
                        ? conv.participants.find((p) => p.userId !== user?.id)?.user.name
                        : conv.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {conv.messages?.[0]?.content || 'No messages yet'}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <h3 className="font-bold">
                      {selectedConversation.type === 'DIRECT'
                        ? selectedConversation.participants.find((p) => p.userId !== user?.id)?.user.name
                        : selectedConversation.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedConversation.participants.length} participants
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled>
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" disabled>
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-3 ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 border'
                        }`}
                      >
                        {!isOwn && (
                          <div className="text-sm font-medium mb-1">{message.sender.name}</div>
                        )}
                        <div className="break-words">{message.content}</div>
                        <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white dark:bg-gray-800 border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending}
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="max-w-md">
                <CardHeader>
                  <h3 className="text-xl font-bold text-center">Select a conversation</h3>
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    Choose a conversation from the sidebar or start a new one
                  </p>
                </CardHeader>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
