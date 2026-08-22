'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { callsApi, JoinCallResponse } from '@/lib/calls-api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  Volume2,
  X,
} from 'lucide-react';

interface InCallMessage {
  id: string;
  senderName: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export default function ActiveCallPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const [call, setCall] = useState<JoinCallResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVirtualAvatar, setIsVirtualAvatar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<InCallMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const [cameraWarning, setCameraWarning] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteUserNames, setRemoteUserNames] = useState<Map<string, string>>(new Map());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasAnimationIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Real-time audio volume detection for speaking pulse effect
  useEffect(() => {
    if (!localStream || isMuted) {
      setIsSpeaking(false);
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) {
      setIsSpeaking(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(localStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animationFrameId: number;

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setIsSpeaking(average > 18);
        animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();

      return () => {
        cancelAnimationFrame(animationFrameId);
        if (audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
      };
    } catch (e) {
      console.warn('Audio analyser setup skipped:', e);
    }
  }, [localStream, isMuted]);

  // Generate dynamic canvas animated studio face stream when virtual avatar is activated or camera is absent
  const generateVirtualFaceStream = useCallback((userName: string): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    virtualCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');

    let hue = 330;
    let pulse = 0;

    const render = () => {
      if (!ctx) return;
      pulse += 0.04;
      const wave = Math.sin(pulse) * 12;

      // Elegant Dark Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
      bgGrad.addColorStop(0, '#0F0E17');
      bgGrad.addColorStop(0.5, '#1F1A2C');
      bgGrad.addColorStop(1, '#0B0A10');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1280, 720);

      // Ambient Glowing Rings behind Avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(640, 360, 180 + wave * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(109, 76, 91, 0.18)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(640, 360, 140 + wave, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(154, 112, 128, 0.28)';
      ctx.fill();
      ctx.restore();

      // Main Face / Avatar Orb
      const orbGrad = ctx.createLinearGradient(520, 240, 760, 480);
      orbGrad.addColorStop(0, '#8A586E');
      orbGrad.addColorStop(1, '#533443');
      ctx.beginPath();
      ctx.arc(640, 360, 110, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#D98C9A';
      ctx.stroke();

      // Stylized Initial or Face
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 90px "Outfit", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(userName.charAt(0).toUpperCase() || 'U', 640, 360);

      // Name Banner at bottom of tile
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.roundRect?.(440, 520, 400, 50, 25);
      ctx.fill();
      ctx.fillStyle = '#E8B6BF';
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.fillText(`✨ ${userName} (Studio Avatar)`, 640, 552);

      // Animated Sound Waves indicator at top
      ctx.fillStyle = '#5F8F72';
      for (let i = 0; i < 7; i++) {
        const barHeight = Math.abs(Math.sin(pulse * 2 + i * 0.8)) * 25 + 6;
        ctx.fillRect(600 + i * 12, 210 - barHeight / 2, 6, barHeight);
      }

      canvasAnimationIdRef.current = requestAnimationFrame(render);
    };

    render();

    const canvasStream = canvas.captureStream(30);
    // Add existing audio track if available
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      canvasStream.addTrack(localStreamRef.current.getAudioTracks()[0]);
    }

    return canvasStream;
  }, []);

  // Safely attach stream to video element
  const attachStreamToVideo = useCallback((videoEl: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!videoEl || !stream) return;
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    videoEl.play().catch((err) => {
      console.warn('Video playback warning:', err);
    });
  }, []);

  // Update local video element whenever localStream or state changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      attachStreamToVideo(localVideoRef.current, localStream);
    }
  }, [localStream, isVideoOff, isVirtualAvatar, attachStreamToVideo]);

  // Replace video track across all active peer connections
  const replacePeerVideoTrack = useCallback((newTrack: MediaStreamTrack | null) => {
    peerConnectionsRef.current.forEach((pc) => {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender && newTrack) {
        videoSender.replaceTrack(newTrack).catch((err) => {
          console.warn('Failed to replace track on peer:', err);
        });
      } else if (newTrack && !videoSender) {
        try {
          pc.addTrack(newTrack, localStreamRef.current!);
        } catch (e) {
          console.warn('Add track error:', e);
        }
      }
    });
  }, []);

  // Initialize Local Media with cascading fallbacks
  const initLocalMedia = useCallback(
    async (isVideoCall = true) => {
      setCameraWarning(null);

      // Stop any existing animation
      if (canvasAnimationIdRef.current) {
        cancelAnimationFrame(canvasAnimationIdRef.current);
      }

      let stream: MediaStream | null = null;

      // 1. Try High-Quality WebCam & Audio
      if (isVideoCall) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
            audio: true,
          });
        } catch (err1) {
          console.warn('High quality constraints failed, attempting standard constraints:', err1);
          // 2. Try Standard WebCam & Audio
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
          } catch (err2) {
            console.warn('Standard video+audio failed, attempting video-only:', err2);
            // 3. Try Video Only (in case audio device is busy)
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
            } catch (err3) {
              console.warn('Video hardware unavailable, attempting audio-only:', err3);
              // 4. Try Audio Only
              try {
                const audioStream = await navigator.mediaDevices.getUserMedia({
                  audio: true,
                  video: false,
                });
                stream = audioStream;
                setCameraWarning(
                  'Physical camera not detected or blocked. You can use your microphone or enable Studio Avatar below!'
                );
              } catch (err4) {
                console.warn('No physical media devices accessible:', err4);
                setCameraWarning(
                  'Camera & microphone permissions are disabled. Please allow media access in your browser.'
                );
              }
            }
          }
        }
      } else {
        // Audio call requested
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        } catch (err) {
          console.warn('Audio call media acquisition failed:', err);
          setCameraWarning('Microphone permission required for voice calls.');
        }
      }

      // If no physical camera stream could be acquired, use virtual avatar stream so face is ALWAYS visible
      if (!stream || stream.getVideoTracks().length === 0) {
        if (isVideoCall) {
          const virtualStream = generateVirtualFaceStream(user?.name || 'You');
          if (stream) {
            // Merge audio from physical stream with virtual video
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) virtualStream.addTrack(audioTrack);
          }
          stream = virtualStream;
          setIsVirtualAvatar(true);
        }
      }

      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoOff(false);

        if (localVideoRef.current) {
          attachStreamToVideo(localVideoRef.current, stream);
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          replacePeerVideoTrack(videoTrack);
        }
      }

      return stream;
    },
    [user?.name, generateVirtualFaceStream, attachStreamToVideo, replacePeerVideoTrack]
  );

  // Clean up all media and sockets
  const cleanup = useCallback(async () => {
    if (canvasAnimationIdRef.current) {
      cancelAnimationFrame(canvasAnimationIdRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setLocalStream(null);

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingIceCandidatesRef.current.clear();

    const socket = getSocket();
    if (socket) {
      socket.emit('webrtc:leave-call', { callId: params.id });
    }

    try {
      if (params.id) {
        await callsApi.leaveCall(params.id as string);
      }
    } catch (err) {
      console.error('Failed to leave call on server:', err);
    }
  }, [params.id]);

  // Create WebRTC Peer Connection
  const createPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      const existingPc = peerConnectionsRef.current.get(userId);
      if (existingPc && existingPc.signalingState !== 'closed') {
        return existingPc;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          const existing = next.get(userId) || new MediaStream();
          stream.getTracks().forEach((t) => {
            if (!existing.getTracks().some((et) => et.id === t.id)) {
              existing.addTrack(t);
            }
          });
          next.set(userId, existing);
          return next;
        });
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
    },
    [params.id]
  );

  // Apply any buffered ICE candidates for a peer
  const flushIceCandidates = useCallback((userId: string, pc: RTCPeerConnection) => {
    const queue = pendingIceCandidatesRef.current.get(userId) || [];
    queue.forEach(async (cand) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Error applying queued ICE candidate:', e);
      }
    });
    pendingIceCandidatesRef.current.delete(userId);
  }, []);

  const handleOffer = useCallback(
    async (data: { callId: string; offer: any; fromUserId: string }) => {
      const pc = createPeerConnection(data.fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      flushIceCandidates(data.fromUserId, pc);

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
    },
    [createPeerConnection, flushIceCandidates]
  );

  const handleAnswer = useCallback(
    async (data: { callId: string; answer: any; fromUserId: string }) => {
      const pc = peerConnectionsRef.current.get(data.fromUserId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        flushIceCandidates(data.fromUserId, pc);
      }
    },
    [flushIceCandidates]
  );

  const handleIceCandidate = useCallback(
    async (data: { callId: string; candidate: any; fromUserId: string }) => {
      const pc = peerConnectionsRef.current.get(data.fromUserId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Error adding ICE candidate:', e);
        }
      } else {
        const queue = pendingIceCandidatesRef.current.get(data.fromUserId) || [];
        queue.push(data.candidate);
        pendingIceCandidatesRef.current.set(data.fromUserId, queue);
      }
    },
    []
  );

  const handleUserJoined = useCallback(
    async (data: { callId: string; userId: string; userName?: string }) => {
      if (data.userName) {
        setRemoteUserNames((prev) => new Map(prev).set(data.userId, data.userName!));
      }

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
    },
    [createPeerConnection]
  );

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
    setRemoteUserNames((prev) => {
      const newMap = new Map(prev);
      newMap.delete(data.userId);
      return newMap;
    });
  }, []);

  const handleInCallMessage = useCallback((msg: InCallMessage) => {
    setChatMessages((prev) => [...prev, msg]);
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const joinCall = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await callsApi.joinCall({ callId: params.id as string });
      setCall(res.data);

      const isVideo = res.data.call.type !== 'AUDIO';
      await initLocalMedia(isVideo);

      // Populate initial participant names
      if (res.data.call.participants) {
        const nameMap = new Map<string, string>();
        res.data.call.participants.forEach((p) => {
          if (p.user && p.userId !== user?.id) {
            nameMap.set(p.userId, p.user.name);
          }
        });
        setRemoteUserNames(nameMap);
      }

      // Join call room for signaling
      const socket = getSocket();
      if (socket) {
        socket.emit('webrtc:join-call', {
          callId: params.id,
          userName: user?.name,
        });

        socket.off('webrtc:offer');
        socket.off('webrtc:answer');
        socket.off('webrtc:ice-candidate');
        socket.off('webrtc:user-joined');
        socket.off('webrtc:user-left');
        socket.off('call:message');

        socket.on('webrtc:offer', handleOffer);
        socket.on('webrtc:answer', handleAnswer);
        socket.on('webrtc:ice-candidate', handleIceCandidate);
        socket.on('webrtc:user-joined', handleUserJoined);
        socket.on('webrtc:user-left', handleUserLeft);
        socket.on('call:message', handleInCallMessage);
      }

      setIsLoading(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to join call';
      setError(msg);
      setIsLoading(false);
    }
  }, [
    params.id,
    user?.id,
    user?.name,
    initLocalMedia,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handleUserJoined,
    handleUserLeft,
    handleInCallMessage,
  ]);

  useEffect(() => {
    joinCall();
    return () => {
      cleanup();
    };
  }, [params.id]); // Stable mount on call ID change

  // Toggle Microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      } else {
        // No audio track yet, try requesting
        initLocalMedia(true).then(() => setIsMuted(false));
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = async () => {
    if (isVideoOff) {
      // Turn Camera ON
      const stream = await initLocalMedia(true);
      if (stream) {
        setIsVideoOff(false);
        setIsVirtualAvatar(false);
      }
    } else {
      // Turn Camera OFF
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsVideoOff(true);
    }
  };

  // Switch to / from Studio Virtual Avatar
  const toggleStudioAvatar = () => {
    if (isVirtualAvatar) {
      // Switch to real webcam
      initLocalMedia(true);
      setIsVirtualAvatar(false);
    } else {
      // Switch to virtual studio avatar stream
      const stream = generateVirtualFaceStream(user?.name || 'You');
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVirtualAvatar(true);
      setIsVideoOff(false);

      if (localVideoRef.current) {
        attachStreamToVideo(localVideoRef.current, stream);
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        replacePeerVideoTrack(videoTrack);
      }
    }
  };

  // Screen Sharing Toggle
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing and revert to webcam
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      await initLocalMedia(true);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = displayStream;
        setIsScreenSharing(true);

        const screenVideoTrack = displayStream.getVideoTracks()[0];

        // Handle user stopping screen share from browser floating toolbar
        screenVideoTrack.onended = () => {
          setIsScreenSharing(false);
          initLocalMedia(true);
        };

        localStreamRef.current = displayStream;
        setLocalStream(displayStream);

        if (localVideoRef.current) {
          attachStreamToVideo(localVideoRef.current, displayStream);
        }

        replacePeerVideoTrack(screenVideoTrack);
      } catch (e) {
        console.warn('Screen share cancelled or failed:', e);
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Send In-Call Text Message
  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: InCallMessage = {
      id: Date.now().toString(),
      senderId: user?.id || 'me',
      senderName: user?.name || 'You',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    const socket = getSocket();
    if (socket) {
      socket.emit('call:message', {
        callId: params.id,
        message: newMsg,
      });
    }

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleLeaveCall = async () => {
    await cleanup();
    router.push('/dashboard/calls');
  };

  const hasLocalActiveVideo = Boolean(
    localStream &&
      localStream.getVideoTracks().length > 0 &&
      localStream.getVideoTracks().some((t) => t.enabled) &&
      !isVideoOff
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-[#0C0B10] text-white gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#6D4C5B]/30 border-t-[#D98C9A] animate-spin" />
          <Camera className="w-6 h-6 text-[#D98C9A] absolute" />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-200">Entering HD Conference Room...</div>
          <p className="text-xs text-gray-500 mt-1">Establishing peer-to-peer WebRTC channels</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-[#0C0B10] px-4">
        <Card className="max-w-md bg-[#16141D] border-gray-800 text-white shadow-2xl rounded-2xl">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center font-bold text-2xl border border-red-500/20">
              !
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Call Connection Issue</h3>
              <p className="text-xs text-red-300 mt-1.5">{error}</p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                className="text-white border-gray-700 hover:bg-gray-800 rounded-xl text-xs h-9"
                onClick={joinCall}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry
              </Button>
              <Button
                className="bg-[#6D4C5B] hover:bg-[#5a3e4b] text-white rounded-xl text-xs h-9"
                onClick={() => router.push('/dashboard/calls')}
              >
                Back to Calls
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[calc(100vh-8rem)] bg-[#0A090D] text-white flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-800/80 relative"
    >
      {/* Call Header */}
      <div className="bg-[#121018]/90 backdrop-blur-md border-b border-gray-800/80 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl h-8 px-2.5"
            onClick={handleLeaveCall}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-medium">Leave</span>
          </Button>

          <div className="h-4 w-px bg-gray-800" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-xs md:text-sm">
                {call?.call.type === 'VIDEO' ? 'Stitch HD Video Conference' : 'Stitch Voice Call'}
              </h2>
              <span className="bg-[#5F8F72]/20 text-[#5F8F72] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#5F8F72]/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                E2EE Encrypted
              </span>
            </div>
            <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#D98C9A]" />
                {remoteStreams.size + 1} in call
              </span>
              <span>•</span>
              <span className="font-mono text-gray-400">{formatDuration(callDuration)}</span>
            </p>
          </div>
        </div>

        {/* Right Header Badges */}
        <div className="flex items-center gap-2">
          {isVirtualAvatar && (
            <span className="bg-[#6D4C5B]/40 text-[#E8B6BF] border border-[#6D4C5B]/60 text-[10px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 hidden sm:flex">
              <Sparkles className="w-3 h-3" />
              Studio Avatar Active
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className={`h-8 px-2.5 text-xs rounded-xl border border-gray-700 transition-colors ${
              showChat ? 'bg-[#6D4C5B] text-white border-transparent' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            <span>Chat</span>
            {chatMessages.length > 0 && !showChat && (
              <span className="ml-1.5 w-4 h-4 rounded-full bg-pink-500 text-[9px] font-bold flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 text-gray-300 hover:bg-gray-800 rounded-xl"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Camera Alert / Permission Help Banner */}
      {cameraWarning && (
        <div className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraWarning}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] border-amber-700 text-amber-200 hover:bg-amber-900/50 rounded-lg px-2"
              onClick={() => initLocalMedia(true)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry Device
            </Button>
            <Button
              size="sm"
              className="h-6 text-[10px] bg-[#6D4C5B] hover:bg-[#5A3E4B] text-white rounded-lg px-2"
              onClick={toggleStudioAvatar}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Use Studio Avatar
            </Button>
          </div>
        </div>
      )}

      {/* Main Video Area & Sidebar Flex */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div
            className={`grid gap-4 h-full min-h-[380px] ${
              remoteStreams.size === 0
                ? 'grid-cols-1 max-w-2xl mx-auto'
                : remoteStreams.size === 1
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {/* LOCAL USER VIDEO TILE */}
            <div
              className={`relative bg-[#14121B] border rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center shadow-xl transition-all ${
                isSpeaking
                  ? 'border-[#5F8F72] ring-2 ring-[#5F8F72]/50 shadow-[#5F8F72]/20'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* Actual Live Video Feed */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ transform: isScreenSharing ? 'none' : 'scaleX(-1)' }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  hasLocalActiveVideo ? 'opacity-100' : 'hidden'
                }`}
              />

              {/* Dynamic Fallback Avatar Tile when Video is Off */}
              {!hasLocalActiveVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#181622] to-[#0E0D14] text-center p-6 space-y-3">
                  <div className="relative">
                    <div
                      className={`w-24 h-24 rounded-full bg-gradient-to-tr from-[#6D4C5B] to-[#9A7080] flex items-center justify-center text-white text-3xl font-bold shadow-2xl border-2 border-white/20 transition-transform ${
                        isSpeaking ? 'scale-110 ring-4 ring-[#5F8F72]/60' : ''
                      }`}
                    >
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    {isSpeaking && (
                      <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#5F8F72] text-white flex items-center justify-center border-2 border-[#14121B] shadow-md animate-pulse">
                        <Volume2 className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">{user?.name || 'You'}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {isVirtualAvatar ? 'Studio Avatar Active' : 'Camera is muted'}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-gray-700 bg-gray-800/80 text-gray-200 hover:bg-gray-700 rounded-xl h-8 px-3"
                      onClick={() => toggleVideo()}
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Turn On Camera
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white rounded-xl h-8 px-3"
                      onClick={toggleStudioAvatar}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-pink-300" />
                      Studio Face
                    </Button>
                  </div>
                </div>
              )}

              {/* Local User Badge */}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border border-white/10 z-10">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSpeaking ? 'bg-[#5F8F72] animate-ping' : 'bg-[#5F8F72]'
                  }`}
                />
                <span className="font-semibold text-[11px]">You ({user?.name || 'Me'})</span>
                {isMuted ? (
                  <MicOff className="w-3 h-3 text-red-400 ml-0.5" />
                ) : (
                  <Mic className="w-3 h-3 text-[#5F8F72] ml-0.5" />
                )}
                {isVirtualAvatar && (
                  <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1.5 py-0.2 rounded">
                    Avatar
                  </span>
                )}
              </div>

              {/* Local Top Quick Tool */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={toggleStudioAvatar}
                  className="bg-black/60 backdrop-blur text-xs text-gray-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 hover:bg-black/90 flex items-center gap-1"
                  title="Switch to Studio Avatar"
                >
                  <Sparkles className="w-3 h-3 text-pink-300" />
                  <span>{isVirtualAvatar ? 'Use Cam' : 'Studio'}</span>
                </button>
              </div>
            </div>

            {/* REMOTE USER VIDEO TILES */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const remoteName = remoteUserNames.get(userId) || `Colleague (${userId.slice(0, 5)})`;
              const hasRemoteVideo =
                stream.getVideoTracks().length > 0 && stream.getVideoTracks().some((t) => t.enabled);

              return (
                <div
                  key={userId}
                  className="relative bg-[#14121B] border border-gray-800 rounded-2xl overflow-hidden min-h-[300px] shadow-xl flex items-center justify-center"
                >
                  <video
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${hasRemoteVideo ? 'block' : 'hidden'}`}
                    ref={(el) => {
                      if (el) {
                        attachStreamToVideo(el, stream);
                      }
                    }}
                  />

                  {/* Remote Fallback Tile if Video is paused */}
                  {!hasRemoteVideo && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#181622] to-[#0E0D14] text-center p-6 space-y-2">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#3B5A45] to-[#5F8F72] flex items-center justify-center text-white text-2xl font-bold shadow-xl border border-white/20">
                        {remoteName.charAt(0).toUpperCase()}
                      </div>
                      <h4 className="text-sm font-semibold text-gray-200">{remoteName}</h4>
                      <p className="text-[11px] text-gray-500">Audio connected</p>
                    </div>
                  )}

                  {/* Remote Participant Badge */}
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-medium border border-white/10 z-10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="font-semibold text-[11px]">{remoteName}</span>
                  </div>
                </div>
              );
            })}

            {/* WAITING ROOM PLACEHOLDER (When alone in call) */}
            {remoteStreams.size === 0 && (
              <div className="border-2 border-dashed border-gray-800/90 rounded-2xl min-h-[300px] flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-[#121018]/40">
                <div className="w-12 h-12 rounded-full bg-gray-800/80 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-[#D98C9A]" />
                </div>
                <h4 className="text-sm font-semibold text-gray-300">Ready for Participants</h4>
                <p className="text-xs text-gray-500 max-w-xs mt-1">
                  Your HD camera feed and WebRTC stream are broadcasting live.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-700 rounded-xl"
                    onClick={() => {
                      navigator.clipboard?.writeText?.(window.location.href);
                      alert('Call link copied to clipboard!');
                    }}
                  >
                    Copy Room Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IN-CALL CHAT DRAWER */}
        {showChat && (
          <div className="w-80 md:w-96 bg-[#13111A] border-l border-gray-800 flex flex-col z-20 animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-xs text-white flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#D98C9A]" />
                In-Call Room Chat
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                onClick={() => setShowChat(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  No messages yet. Send a message to participants!
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isOwn = msg.senderId === user?.id || msg.senderId === 'me';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] font-semibold text-gray-400">
                          {isOwn ? 'You' : msg.senderName}
                        </span>
                        <span className="text-[9px] text-gray-600">{msg.timestamp}</span>
                      </div>
                      <div
                        className={`p-2.5 rounded-2xl text-xs max-w-[85%] break-words ${
                          isOwn
                            ? 'bg-[#6D4C5B] text-white rounded-tr-none'
                            : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-gray-800 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="text-xs bg-gray-900 border-gray-700 text-white rounded-xl h-9 focus:border-[#D98C9A]"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white rounded-xl h-9 px-3 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* FLOATING CALL CONTROLS BAR */}
      <div className="bg-[#121018]/95 backdrop-blur-lg border-t border-gray-800 p-3.5 flex items-center justify-center gap-3 md:gap-4 z-20">
        {/* Mute Microphone */}
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="lg"
          className={`rounded-full w-12 h-12 p-0 transition-all ${
            isMuted
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
          }`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
        </Button>

        {/* Video Camera Toggle */}
        <Button
          variant={isVideoOff ? 'destructive' : 'secondary'}
          size="lg"
          className={`rounded-full w-12 h-12 p-0 transition-all ${
            isVideoOff
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
          }`}
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn video on' : 'Turn video off'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5 text-blue-400" />}
        </Button>

        {/* Studio Virtual Avatar Mode */}
        <Button
          variant="secondary"
          size="lg"
          className={`rounded-full w-12 h-12 p-0 transition-all border ${
            isVirtualAvatar
              ? 'bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white border-pink-400 shadow-lg shadow-pink-900/40'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
          }`}
          onClick={toggleStudioAvatar}
          title="Toggle Studio Virtual Face Stream"
        >
          <Sparkles className="w-5 h-5 text-pink-300" />
        </Button>

        {/* Screen Share Toggle */}
        <Button
          variant="secondary"
          size="lg"
          className={`rounded-full w-12 h-12 p-0 transition-all border ${
            isScreenSharing
              ? 'bg-[#5F8F72] hover:bg-[#4E7B5F] text-white border-emerald-400'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
          }`}
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </Button>

        {/* End / Leave Call Button */}
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full px-6 h-12 bg-red-600 hover:bg-red-700 font-bold flex items-center gap-2 shadow-lg shadow-red-950/50 ml-2"
          onClick={handleLeaveCall}
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-xs">End Call</span>
        </Button>
      </div>
    </div>
  );
}
