'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { callsApi, Call, CallType } from '@/lib/calls-api';
import { usersApi } from '@/lib/users-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Phone, Video, Plus, Search, Clock, Users } from 'lucide-react';

export default function CallsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [callHistory, setCallHistory] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [callType, setCallType] = useState<CallType>('VIDEO');

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    try {
      const res = await callsApi.getCallHistory();
      setCallHistory(res.data);
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setIsLoading(false);
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

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleStartCall = async () => {
    if (selectedParticipants.length === 0) {
      alert('Please select at least one participant');
      return;
    }
    try {
      const res = await callsApi.createCall({
        type: callType,
        participantIds: selectedParticipants,
      });
      router.push(`/dashboard/calls/${res.data.id}`);
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Failed to start call. Please try again.');
    }
  };

  const handleJoinCall = (callId: string) => {
    router.push(`/dashboard/calls/${callId}`);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#6D4C5B] border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Loading call history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background text-foreground transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
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
            <h1 className="text-xl font-bold text-foreground">Audio & Video Calls</h1>
            <p className="text-muted-foreground text-xs">Start HD calls and view your call history</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Start New Call */}
          <Card className="border border-border bg-card shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#6D4C5B] dark:text-[#D98C9A]" />
                Start New Call
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Call Type Toggle */}
              <div className="flex gap-2 p-1 bg-sidebar rounded-xl border border-border">
                <button
                  onClick={() => setCallType('VIDEO')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    callType === 'VIDEO'
                      ? 'bg-[#6D4C5B] text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Video Call
                </button>
                <button
                  onClick={() => setCallType('AUDIO')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    callType === 'AUDIO'
                      ? 'bg-[#6D4C5B] text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Audio Call
                </button>
              </div>

              {/* Search Participants */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search participants..."
                  className="pl-10 text-xs bg-input border-border focus:border-[#A66A7A] h-10 rounded-xl"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                />
              </div>

              {/* Selected participants */}
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {filteredUsers
                    .filter((u) => selectedParticipants.includes(u.id))
                    .map((u) => (
                      <span
                        key={u.id}
                        className="bg-[#6D4C5B]/10 border border-[#6D4C5B]/20 text-[#6D4C5B] dark:text-[#E8B6BF] px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1"
                      >
                        {u.name}
                        <button
                          onClick={() => toggleParticipant(u.id)}
                          className="hover:text-[#B85C63] font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              )}

              {/* Search Results */}
              {filteredUsers.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-border rounded-xl bg-background p-1 space-y-0.5">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`p-2 rounded-lg hover:bg-sidebar cursor-pointer flex items-center gap-2 text-xs transition-colors ${
                        selectedParticipants.includes(u.id) ? 'bg-[#6D4C5B]/5' : ''
                      }`}
                      onClick={() => toggleParticipant(u.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(u.id)}
                        onChange={() => toggleParticipant(u.id)}
                        className="rounded border-border pointer-events-none w-3 h-3"
                      />
                      <div className="w-6 h-6 rounded-full bg-[#6D4C5B]/10 text-[#6D4C5B] dark:text-[#E8B6BF] flex items-center justify-center font-bold text-[9px] uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-foreground">{u.name}</span>
                      <span className="text-muted-foreground text-[10px]">({u.employeeId})</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleStartCall}
                disabled={selectedParticipants.length === 0}
                className="w-full bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white rounded-xl text-xs h-10 font-semibold disabled:opacity-50"
              >
                {callType === 'VIDEO' ? (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Start Video Call
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Start Audio Call
                  </>
                )}
              </Button>

              {selectedParticipants.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Search and select at least one participant above to start
                </p>
              )}
            </CardContent>
          </Card>

          {/* Call History */}
          <Card className="border border-border bg-card shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#A66A7A]" />
                Call History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {callHistory.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Phone className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium">No call history yet</p>
                  <p className="text-[10px] text-muted-foreground">Start a call to see it here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {callHistory.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 border border-border rounded-xl hover:bg-sidebar/50 cursor-pointer transition-colors"
                      onClick={() => handleJoinCall(call.id)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {call.type === 'VIDEO' ? (
                            <div className="w-7 h-7 rounded-lg bg-[#5F8F72]/10 text-[#5F8F72] flex items-center justify-center">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-[#6D4C5B]/10 text-[#6D4C5B] dark:text-[#D98C9A] flex items-center justify-center">
                              <Phone className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="text-xs font-semibold text-foreground">
                            {call.initiatorId === user?.id ? 'You initiated' : `${call.participants[0]?.user?.name || 'A user'} initiated`}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(call.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{call.participants?.length || 0} participants</span>
                        </div>
                        {call.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(call.duration)}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            call.status === 'ENDED'
                              ? 'bg-sidebar text-muted-foreground border border-border'
                              : call.status === 'ONGOING'
                              ? 'bg-[#5F8F72]/15 text-[#5F8F72] border border-[#5F8F72]/30'
                              : 'bg-[#C49A5A]/15 text-[#C49A5A] border border-[#C49A5A]/30'
                          }`}
                        >
                          {call.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
