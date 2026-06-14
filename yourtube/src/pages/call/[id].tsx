"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";

const buildIceConfig = (): RTCConfiguration => {
  const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  try {
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_TURN_URL);
    const turnUser = process.env.NEXT_PUBLIC_TURN_USER || (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_TURN_USER);
    const turnPass = process.env.NEXT_PUBLIC_TURN_PASS || (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_TURN_PASS);
    if (turnUrl) {
      const turn: RTCIceServer = { urls: turnUrl } as any;
      if (turnUser && turnPass) {
        (turn as any).username = turnUser;
        (turn as any).credential = turnPass;
      }
      iceServers.push(turn);
    }
  } catch (e) {
    // ignore
  }
  return { iceServers };
};

const VideoCallPage = ({ params }: any) => {
  const router = useRouter();
  const { id } = params || {};
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const callTimerRef = useRef<number | null>(null);
  const [connectionState, setConnectionState] = useState("new");

  useEffect(() => {
    let mounted = true;
    const socket = getSocket();

    const role = (new URLSearchParams(window.location.search)).get("role");
    const roomParam = (new URLSearchParams(window.location.search)).get("room");

    const setupPeerAndMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return;
        if (localRef.current) {
          localRef.current.srcObject = stream;
          localRef.current.muted = true;
          localRef.current.play().catch(() => {});
        }

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;

        pcRef.current = new RTCPeerConnection(buildIceConfig());
        const pc = pcRef.current;

        // add local tracks
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          const [remoteStream] = ev.streams;
          if (remoteRef.current) {
            remoteRef.current.srcObject = remoteStream;
            remoteRef.current.play().catch(() => {});
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", { target: id, candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          setConnectionState(pc.connectionState || "unknown");
        };

        socket.on("user-joined", async ({ id: otherId }) => {
          if (!pc) return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { target: otherId, sdp: offer });
        });

        socket.on("offer", async ({ from, sdp }) => {
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { target: from, sdp: answer });
        });

        socket.on("answer", async ({ from, sdp }) => {
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on("ice-candidate", async ({ from, candidate }) => {
          if (!pc || !candidate) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("Failed to add ICE candidate", e);
          }
        });

        // join room
        socket.emit("join-room", { roomId: roomParam || id });
        setConnected(true);
        // start call timer
        callTimerRef.current = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
      } catch (err) {
        console.error("media error", err);
      }
    };

    // If caller, wait for call-response; if callee or accepted, start immediately
    if (role === "caller") {
      const onResponse = ({ accepted, roomId }: any) => {
        if (accepted) {
          setupPeerAndMedia();
        } else {
          // call declined
          alert("Call declined");
          router.push("/");
        }
      };
      socket.on("call-response", onResponse);
      // cleanup
      return () => {
        mounted = false;
        socket.off("call-response", onResponse);
      };
    } else {
      // callee or direct join
      setupPeerAndMedia();
    }

    return () => {
      mounted = false;
      const socket = getSocket();
      socket.emit("leave-room", { roomId: id });
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, [id]);

  // handle remote ending the call
  useEffect(() => {
    const socket = getSocket();
    const onCallEnded = () => {
      // stop and navigate home
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      router.push("/");
    };
    socket.on("call-ended", onCallEnded);
    return () => {
      socket.off("call-ended", onCallEnded);
    };
  }, []);

  const startRecording = async () => {
    if (recording) return;
    const remoteStream = remoteRef.current?.srcObject as MediaStream | null;
    const localStream = localStreamRef.current;
    const mixed = new MediaStream();
    // prefer remote video if available
    if (remoteStream) {
      remoteStream.getVideoTracks().forEach((t) => mixed.addTrack(t));
    } else if (localStream) {
      localStream.getVideoTracks().forEach((t) => mixed.addTrack(t));
    }
    // add audio tracks from both sides if available
    if (localStream) localStream.getAudioTracks().forEach((t) => mixed.addTrack(t));
    if (remoteStream) remoteStream.getAudioTracks().forEach((t) => mixed.addTrack(t));

    const options: MediaRecorderOptions = { mimeType: "video/webm;codecs=vp9,opus" } as any;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(mixed, options);
    } catch (e) {
      // fallback
      recorder = new MediaRecorder(mixed as any);
    }
    recordedChunksRef.current = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size) recordedChunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      // upload to server
      (async () => {
        try {
          const form = new FormData();
          form.append("recording", blob, `call-${Date.now()}.webm`);
          const room = (new URLSearchParams(window.location.search)).get("room") || id;
          form.append("roomId", room || id);
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/call/recording", {
            method: 'POST',
            body: form,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
        } catch (e) {
          console.warn('Upload failed', e);
        }
      })();
      setRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingSeconds(0);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };

  const endCall = () => {
    const socket = getSocket();
    socket.emit("end-call", { roomId: (new URLSearchParams(window.location.search)).get("room") || id });
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => s.track?.stop());
      pcRef.current.close();
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    router.push("/");
  };

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    if (!screenTrackRef.current) {
      try {
        const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
          screenTrack.onended = async () => {
            const camera = cameraTrackRef.current;
            if (camera && sender) await sender.replaceTrack(camera);
            screenTrackRef.current = null;
          };
          screenTrackRef.current = screenTrack;
        }
      } catch (e) {
        console.warn("screen share error", e);
      }
    } else {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      const camera = cameraTrackRef.current;
      if (sender && camera) await sender.replaceTrack(camera);
      if (screenTrackRef.current) screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
  };

  return (
    <main className="flex-1 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Call ID: {id}</div>
          <div className="text-sm text-gray-600">Status: {connectionState} • Duration: {Math.floor(callSeconds/60).toString().padStart(2,'0')}:{(callSeconds%60).toString().padStart(2,'0')}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(!connected && (new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('role')) === 'caller') ? (
            <div className="md:col-span-3 bg-gray-50 rounded-lg p-6 text-center">
              <div className="text-lg font-medium">Calling...</div>
              <div className="text-sm text-gray-600">Waiting for the recipient to accept the call.</div>
            </div>
          ) : null}
          <div className="md:col-span-2 bg-black aspect-video rounded-lg flex items-center justify-center text-white">
            <video ref={remoteRef} className="w-full h-full object-cover rounded-lg" playsInline />
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <video ref={localRef} className="w-full h-48 object-cover rounded" playsInline />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                const local = localStreamRef.current;
                if (!local) return;
                local.getAudioTracks().forEach(t => t.enabled = !t.enabled);
                // re-render by toggling state
                setConnected(s => s);
              }}>{localStreamRef.current?.getAudioTracks()[0]?.enabled ? "Mute" : "Unmute"}</Button>
              <Button onClick={() => {
                const pc = pcRef.current;
                if (pc) {
                  const videoTrack = pc.getSenders().map(s => s.track).find(t => t?.kind === 'video');
                  if (videoTrack) (videoTrack as MediaStreamTrack).enabled = !(videoTrack as MediaStreamTrack).enabled;
                }
              }}>{cameraTrackRef.current?.enabled ? "Camera Off" : "Camera On"}</Button>
              <Button onClick={() => toggleScreenShare()}>Share Screen</Button>
              {!recording ? (
                <Button onClick={() => startRecording()} className="bg-red-600 text-white">Record</Button>
              ) : (
                <Button onClick={() => stopRecording()} className="bg-gray-800 text-white">Stop</Button>
              )}
            </div>
            <div>
              <Button variant="destructive" onClick={() => endCall()}>End Call</Button>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500">WebRTC: basic signaling + peer connection active: {connected ? "yes" : "no"}.</div>
      </div>
    </main>
  );
};

export default VideoCallPage;
