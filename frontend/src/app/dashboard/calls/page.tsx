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
  const [showNewCall, setShowNewCall] = useState(false);
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

      // Navigate to active call page
      router.push(`/dashboard/calls/${res.data.id}`);
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Failed to start call');
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calls</h1>
            <p className="text-gray-600 dark:text-gray-400">Audio and video meetings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Start New Call */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Start New Call
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={callType === 'VIDEO' ? 'default' : 'outline'}
                  onClick={() => setCallType('VIDEO')}
                  className="flex-1"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video Call
                </Button>
                <Button
                  variant={callType === 'AUDIO' ? 'default' : 'outline'}
                  onClick={() => setCallType('AUDIO')}
                  className="flex-1"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Audio Call
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search participants..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                />
              </div>

              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filteredUsers
                    .filter((u) => selectedParticipants.includes(u.id))
                    .map((u) => (
                      <span
                        key={u.id}
                        className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                      >
                        {u.name}
                        <button
                          onClick={() => toggleParticipant(u.id)}
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
                        selectedParticipants.includes(u.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                      onClick={() => toggleParticipant(u.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(u.id)}
                        onChange={() => toggleParticipant(u.id)}
                        className="pointer-events-none"
                      />
                      <span>{u.name}</span>
                      <span className="text-sm text-gray-500">({u.employeeId})</span>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleStartCall} className="w-full" disabled={selectedParticipants.length === 0}>
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
            </CardContent>
          </Card>

          {/* Call History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Call History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {callHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  No call history yet
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {callHistory.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleJoinCall(call.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {call.type === 'VIDEO' ? (
                            <Video className="w-4 h-4 text-green-600" />
                          ) : (
                            <Phone className="w-4 h-4 text-blue-600" />
                          )}
                          <span className="font-medium">
                            {call.initiatorId === user?.id ? 'You initiated' : `${call.participants[0]?.user?.name || 'A user'} initiated`}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(call.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
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
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            call.status === 'ENDED'
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              : call.status === 'ONGOING'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
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
