'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { callsApi, JoinCallResponse } from '@/lib/calls-api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Users,
  Camera,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function ActiveCallPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const [call, setCall] = useState<JoinCallResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState('');
  const [cameraWarning, setCameraWarning] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Attach local media stream to video element whenever localStream or DOM updates
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((err) => {
        console.warn('Video auto-play warning:', err);
      });
    }
  }, [localStream, isLoading, isVideoOff]);

  const initLocalMedia = useCallback(async (isVideoCall: boolean) => {
    try {
      setCameraWarning(null);
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoCall
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              }
            : false,
          audio: true,
        });
      } catch (err: any) {
        console.warn('Optimal media constraints failed, falling back to basic stream:', err);
        // Fallback with basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoCall,
          audio: true,
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Attach immediately if video element is already available
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      return stream;
    } catch (mediaErr: any) {
      console.warn('Could not access camera/microphone:', mediaErr);
      setCameraWarning(
        mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError'
          ? 'Camera or microphone permission was denied. Please allow camera permissions in your browser URL bar.'
          : 'Could not detect video camera. You can still participate using audio or check device permissions.'
      );
      return null;
    }
  }, []);

  const cleanup = useCallback(async () => {
    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
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
    } catch (err) {
      console.error('Failed to leave call on server:', err);
    }
  }, [params.id]);

  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local stream tracks to this peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams((prev) => new Map(prev).set(userId, remoteStream));
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
  }, [params.id]);

  const handleOffer = useCallback(async (data: { callId: string; offer: any; fromUserId: string }) => {
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
  }, [createPeerConnection]);

  const handleAnswer = useCallback(async (data: { callId: string; answer: any; fromUserId: string }) => {
    const pc = peerConnectionsRef.current.get(data.fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  }, []);

  const handleIceCandidate = useCallback(async (data: { callId: string; candidate: any; fromUserId: string }) => {
    const pc = peerConnectionsRef.current.get(data.fromUserId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }, []);

  const handleUserJoined = useCallback(async (data: { callId: string; userId: string }) => {
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
  }, [createPeerConnection]);

  const handleUserLeft = useCallback((data: { callId: string; userId: string }) => {
    const pc = peerConnectionsRef.current.get(data.userId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(data.userId);
    }
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(data.userId);
      return newMap;
    });
  }, []);

  const joinCall = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await callsApi.joinCall({ callId: params.id as string });
      setCall(res.data);

      const isVideo = res.data.call.type === 'VIDEO';
      await initLocalMedia(isVideo);

      // Join call room for signaling
      const socket = getSocket();
      if (socket) {
        socket.emit('webrtc:join-call', { callId: params.id });

        socket.off('webrtc:offer');
        socket.off('webrtc:answer');
        socket.off('webrtc:ice-candidate');
        socket.off('webrtc:user-joined');
        socket.off('webrtc:user-left');

        socket.on('webrtc:offer', handleOffer);
        socket.on('webrtc:answer', handleAnswer);
        socket.on('webrtc:ice-candidate', handleIceCandidate);
        socket.on('webrtc:user-joined', handleUserJoined);
        socket.on('webrtc:user-left', handleUserLeft);
      }

      setIsLoading(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to join call';
      setError(msg);
      setIsLoading(false);
    }
  }, [params.id, initLocalMedia, handleOffer, handleAnswer, handleIceCandidate, handleUserJoined, handleUserLeft]);

  useEffect(() => {
    joinCall();
    return () => {
      cleanup();
    };
  }, [joinCall, cleanup]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = async () => {
    if (!localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0) {
      // Stream did not have video, request it now
      const stream = await initLocalMedia(true);
      if (stream) {
        setIsVideoOff(false);
      }
      return;
    }

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleLeaveCall = async () => {
    await cleanup();
    router.push('/dashboard/calls');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-950 text-white gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#6D4C5B] border-t-transparent animate-spin" />
        <div className="text-sm font-medium text-gray-300">Connecting to Live Conference Room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-950 px-4">
        <Card className="max-w-md bg-gray-900 border-gray-800 text-white shadow-2xl">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center font-bold text-2xl">
              !
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Call Connection Issue</h3>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                className="text-white border-gray-700 hover:bg-gray-800"
                onClick={joinCall}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button className="bg-[#6D4C5B] hover:bg-[#5a3e4b]" onClick={() => router.push('/dashboard/calls')}>
                Back to Calls
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-950 text-white flex flex-col rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={handleLeaveCall}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Leave</span>
          </Button>
          <div>
            <h2 className="font-semibold text-white text-base">
              {call?.call.type === 'VIDEO' ? 'HD Video Conference' : 'Voice Call'}
            </h2>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{remoteStreams.size + 1} participant{remoteStreams.size + 1 > 1 ? 's' : ''} in room</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-gray-400 bg-gray-800/80 px-3 py-1.5 rounded-md border border-gray-700">
          Live Session Active
        </div>
      </div>

      {/* Camera Warning Banner if permissions were blocked */}
      {cameraWarning && (
        <div className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraWarning}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-700 text-amber-200 hover:bg-amber-900/50"
            onClick={() => initLocalMedia(true)}
          >
            <Camera className="w-3.5 h-3.5 mr-1" />
            Enable Camera
          </Button>
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 h-full min-h-[420px]">
          {/* Local User Video Tile */}
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden min-h-[320px] flex items-center justify-center shadow-lg group">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ transform: 'scaleX(-1)' }}
              className={`w-full h-full object-cover ${isVideoOff || !localStream ? 'hidden' : 'block'}`}
            />

            {(isVideoOff || !localStream) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-center p-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#6D4C5B] to-[#9A7080] flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-gray-300 font-medium mt-3">{user?.name || 'You'}</span>
                <span className="text-xs text-gray-500 mt-0.5">Camera is turned off</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs border-gray-700 text-gray-200 hover:bg-gray-800"
                  onClick={() => toggleVideo()}
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Turn On Camera
                </Button>
              </div>
            )}

            {/* User Label Badge */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border border-white/10 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>You ({user?.name || 'Local'})</span>
              {isMuted && <MicOff className="w-3 h-3 text-red-400 ml-1" />}
            </div>
          </div>

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <div
              key={userId}
              className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden min-h-[320px] shadow-lg flex items-center justify-center"
            >
              <video
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (el && el.srcObject !== stream) {
                    el.srcObject = stream;
                    el.play().catch(() => {});
                    remoteVideoRefs.current.set(userId, el);
                  }
                }}
              />
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/10 z-10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Colleague ({userId.slice(0, 6)})</span>
              </div>
            </div>
          ))}

          {/* Waiting for colleagues placeholder if alone */}
          {remoteStreams.size === 0 && (
            <div className="border-2 border-dashed border-gray-800/80 rounded-2xl min-h-[320px] flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-gray-900/30">
              <Users className="w-10 h-10 text-gray-600 mb-2" />
              <p className="text-sm font-medium text-gray-400">Waiting for other participants...</p>
              <p className="text-xs text-gray-600 max-w-xs mt-1">
                Share this call room with your team members to start collaborating live.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Call Controls Bar */}
      <div className="bg-gray-900/95 backdrop-blur border-t border-gray-800 p-4 flex items-center justify-center gap-4">
        {/* Mute Toggle */}
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="lg"
          className={`rounded-full w-12 h-12 p-0 transition-all ${
            isMuted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
          }`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        {/* Video Toggle */}
        <Button
          variant={isVideoOff ? 'destructive' : 'secondary'}
          size="lg"
          className={`rounded-full w-12 h-12 p-0 transition-all ${
            isVideoOff ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
          }`}
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn video on' : 'Turn video off'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </Button>

        {/* End / Leave Call */}
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full px-6 h-12 bg-red-600 hover:bg-red-700 font-medium flex items-center gap-2 shadow-lg shadow-red-950/50"
          onClick={handleLeaveCall}
        >
          <PhoneOff className="w-5 h-5" />
          <span>End Call</span>
        </Button>
      </div>
    </div>
  );
}
