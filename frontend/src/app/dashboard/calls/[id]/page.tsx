'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { callsApi, JoinCallResponse } from '@/lib/calls-api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users } from 'lucide-react';

export default function ActiveCallPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  
  const [call, setCall] = useState<JoinCallResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState('');
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    joinCall();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    // Leave call via socket
    const socket = getSocket();
    if (socket) {
      socket.emit('webrtc:leave-call', { callId: params.id });
    }
    
    // Notify backend
    try {
      if (params.id) {
        await callsApi.leaveCall(params.id as string);
      }
    } catch (error) {
      console.error('Failed to leave call:', error);
    }
  };

  const joinCall = async () => {
    try {
      const res = await callsApi.joinCall({ callId: params.id as string });
      setCall(res.data);

      // Get local media stream (fallback if user media permissions are not granted/headless)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: res.data.call.type === 'VIDEO',
          audio: true,
        });
        
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (mediaErr) {
        console.warn('Could not access media devices:', mediaErr);
      }

      // Join call room for signaling
      const socket = getSocket();
      if (socket) {
        socket.emit('webrtc:join-call', { callId: params.id });
        
        // Set up WebRTC signaling handlers
        socket.on('webrtc:offer', handleOffer);
        socket.on('webrtc:answer', handleAnswer);
        socket.on('webrtc:ice-candidate', handleIceCandidate);
        socket.on('webrtc:user-joined', handleUserJoined);
        socket.on('webrtc:user-left', handleUserLeft);
      }

      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to join call');
      setIsLoading(false);
    }
  };

  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => new Map(prev).set(userId, remoteStream));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        if (socket) {
          socket.emit('webrtc:ice-candidate', {
            callId: params.id,
            candidate: event.candidate,
            targetUserId: userId,
          });
        }
      }
    };

    peerConnectionsRef.current.set(userId, pc);
    return pc;
  };

  const handleOffer = async (data: { callId: string; offer: any; fromUserId: string }) => {
    const pc = createPeerConnection(data.fromUserId);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    const socket = getSocket();
    if (socket) {
      socket.emit('webrtc:answer', {
        callId: data.callId,
        answer,
        targetUserId: data.fromUserId,
      });
    }
  };

  const handleAnswer = async (data: { callId: string; answer: any; fromUserId: string }) => {
    const pc = peerConnectionsRef.current.get(data.fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  };

  const handleIceCandidate = async (data: { callId: string; candidate: any; fromUserId: string }) => {
    const pc = peerConnectionsRef.current.get(data.fromUserId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  const handleUserJoined = async (data: { callId: string; userId: string }) => {
    const pc = createPeerConnection(data.userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    const socket = getSocket();
    if (socket) {
      socket.emit('webrtc:offer', {
        callId: data.callId,
        offer,
        targetUserId: data.userId,
      });
    }
  };

  const handleUserLeft = (data: { callId: string; userId: string }) => {
    const pc = peerConnectionsRef.current.get(data.userId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(data.userId);
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.userId);
      return newMap;
    });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const handleLeaveCall = async () => {
    await cleanup();
    router.push('/dashboard/calls');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-lg">Joining call...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => router.push('/dashboard/calls')}>Back to Calls</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/calls')}>
            <ArrowLeft className="w-4 h-4 mr-2 text-white" />
            <span className="text-white">Leave</span>
          </Button>
          <div className="text-white">
            <h2 className="font-bold">
              {call?.call.type === 'VIDEO' ? 'Video Call' : 'Audio Call'}
            </h2>
            <p className="text-sm text-gray-400">
              <Users className="w-3 h-3 inline mr-1" />
              {remoteStreams.size + 1} participants
            </p>
          </div>
        </div>
        <div className="text-white text-sm">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm z-10">
              You
            </div>
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl">
                  {user?.name.charAt(0)}
                </div>
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <div key={userId} className="relative bg-gray-800 rounded-lg overflow-hidden min-h-[300px]">
              <video
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (el) {
                    el.srcObject = stream;
                    remoteVideoRefs.current.set(userId, el);
                  }
                }}
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm z-10">
                User {userId.slice(0, 8)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center gap-4">
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="lg"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button
          variant={isVideoOff ? 'destructive' : 'secondary'}
          size="lg"
          onClick={toggleVideo}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </Button>
        <Button variant="destructive" size="lg" onClick={handleLeaveCall}>
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
