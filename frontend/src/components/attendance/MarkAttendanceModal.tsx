import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  RefreshCw,
  X,
  ArrowLeft,
} from 'lucide-react';

import { api } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { displayName } from '../../utils/userDisplay';

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (record: any) => void;
}

type ScanState = 'idle' | 'countdown' | 'capturing' | 'verifying' | 'success' | 'error';

// Worker's self-service "mark my own attendance" flow — no worker_id/geofence
// sent, the AI engine identifies from frames alone.
export const MarkAttendanceModal: React.FC<MarkAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const user = useAuthStore((state) => state.user);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Align your face in the oval guide');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [captureProgress, setCaptureProgress] = useState<number>(0);
  const [attendanceResult, setAttendanceResult] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch {
      // Audio not permitted or not supported — ignore
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setScanState('error');
      setErrorMessage('Camera permission denied or camera not found. Please enable camera access in your browser settings.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setScanState('idle');
      setErrorMessage(null);
      setAttendanceResult(null);
      setCaptureProgress(0);
      setStatusMessage('Align your face in the oval guide');
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const captureFrameBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        reject(new Error('Video or canvas element unavailable'));
        return;
      }

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const maxDim = 640;
      let targetW = vw;
      let targetH = vh;
      if (Math.max(vw, vh) > maxDim) {
        const scale = maxDim / Math.max(vw, vh);
        targetW = Math.round(vw * scale);
        targetH = Math.round(vh * scale);
      }

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, targetW, targetH);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas frame encoding failed'))),
        'image/jpeg',
        0.85
      );
    });
  };

  const startBiometricSequence = async () => {
    setErrorMessage(null);
    setScanState('countdown');
    setCountdown(3);

    for (let c = 3; c > 0; c--) {
      setCountdown(c);
      setStatusMessage(`Get ready... Blink your eyes when prompted (${c})`);
      await new Promise((r) => setTimeout(r, 800));
    }

    setScanState('capturing');
    setStatusMessage('BLINK NOW! Capturing face sequence...');
    setCaptureProgress(10);

    const capturedBlobs: Blob[] = [];
    const totalFrames = 3;

    try {
      for (let i = 0; i < totalFrames; i++) {
        const blob = await captureFrameBlob();
        capturedBlobs.push(blob);
        setCaptureProgress(Math.round(((i + 1) / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 200));
      }

      setScanState('verifying');
      setStatusMessage('Analyzing liveness & face identity...');

      const formData = new FormData();
      capturedBlobs.forEach((blob, idx) => {
        formData.append('files', blob, `frame_${idx + 1}.jpg`);
      });

      const response = await api.post('/attendance/mark', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      const data = response.data;
      setAttendanceResult(data);
      setScanState('success');
      setStatusMessage('Attendance Confirmed & Recorded!');
      playSuccessChime();

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      setScanState('error');
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Attendance verification failed. Please try again.';
      setErrorMessage(detail);
      setStatusMessage('Verification Failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col my-auto">
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center space-x-1 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition text-xs font-bold mr-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                Face Attendance
              </h2>
              <p className="text-xs text-slate-400">AI Anti-Spoofing & Biometric Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-4/3 w-full bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform -scale-x-100"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-400/70" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-400/70" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-400/70" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-400/70" />

            <div
              className={`w-44 h-56 rounded-[50%] border-2 border-dashed transition-all duration-300 flex items-center justify-center ${
                scanState === 'capturing'
                  ? 'border-green-400 scale-105 shadow-[0_0_20px_rgba(74,222,128,0.4)]'
                  : scanState === 'verifying'
                  ? 'border-blue-400 animate-pulse'
                  : scanState === 'error'
                  ? 'border-red-500'
                  : scanState === 'success'
                  ? 'border-green-500 border-solid'
                  : 'border-amber-400/60'
              }`}
            >
              {scanState === 'countdown' && (
                <span className="text-6xl font-black text-amber-400 font-mono animate-ping">{countdown}</span>
              )}
              {scanState === 'capturing' && (
                <div className="text-center bg-black/60 px-3 py-1 rounded-full border border-green-500/50">
                  <Eye className="w-6 h-6 text-green-400 mx-auto animate-bounce" />
                  <span className="text-xs text-green-300 font-mono font-bold">BLINK EYES</span>
                </div>
              )}
            </div>

            {scanState === 'verifying' && (
              <div className="absolute inset-x-0 h-1 bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_1.5s_infinite]" />
            )}

            <div className="absolute top-3 left-0 right-0 flex justify-center">
              <span className="text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-amber-300 uppercase">
                {scanState === 'verifying' ? 'Neural Matcher Active' : 'FaceNet + MediaPipe Mesh'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-slate-900">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">{statusMessage}</span>
            {scanState === 'capturing' && (
              <span className="font-mono text-green-400 font-bold">{captureProgress}%</span>
            )}
          </div>

          {(scanState === 'capturing' || scanState === 'verifying') && (
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  scanState === 'verifying' ? 'w-full bg-cyan-400 animate-pulse' : 'bg-amber-500'
                }`}
                style={{ width: scanState === 'verifying' ? '100%' : `${captureProgress}%` }}
              />
            </div>
          )}

          {scanState === 'error' && errorMessage && (
            <div className="p-3 bg-red-950/70 border border-red-700/80 rounded-xl text-red-200 text-xs flex items-start space-x-2 animate-shake">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Verification Refused</p>
                <p className="text-slate-300 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {scanState === 'success' && attendanceResult && (
            <div className="p-3.5 bg-green-950/70 border border-green-600/80 rounded-xl text-green-100 text-xs space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <span className="font-bold text-sm text-green-300">Punch-In Verified & Logged</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300 font-mono text-[11px] border-t border-green-800/40">
                <div>
                  <span className="text-slate-400 block">Worker:</span>
                  <span className="text-white font-bold">
                    {attendanceResult?.worker_name || displayName(user)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Liveness:</span>
                  <span className="text-green-400">Blink Confirmed</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 pt-1">
            {scanState === 'idle' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-glass px-5 py-3 rounded-xl text-sm font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={startBiometricSequence}
                  className="flex-1 btn-primary-earth py-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>Mark Attendance Now</span>
                </button>
              </>
            )}

            {scanState === 'error' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-glass px-5 py-3 rounded-xl text-sm font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={startBiometricSequence}
                  className="flex-1 btn-primary-earth py-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Verification</span>
                </button>
              </>
            )}

            {scanState === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-green-500 hover:bg-green-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Done & Return</span>
              </button>
            )}

            {(scanState === 'capturing' || scanState === 'verifying') && (
              <div className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-mono flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>{scanState === 'capturing' ? 'Recording Eye Blink...' : 'Processing Verification...'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            <span>Encrypted Biometric Pipeline • 24h Selfie Purge</span>
          </span>
          <span className="font-mono">SIH26 Compliance Engine</span>
        </div>
      </div>
    </div>
  );
};
