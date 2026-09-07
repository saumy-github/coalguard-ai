import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Eye, Play, Square } from 'lucide-react';

import { api } from '../utils/api';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PageLayout } from '../components/common/PageLayout';

type ScanState = 'idle' | 'waiting' | 'capturing' | 'verifying' | 'success' | 'error';

// Shared-device kiosk — scans continuously and identifies whoever steps up,
// unlike MarkAttendanceModal's single-shot self-service flow.
export const AttendanceKioskPage = () => {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMessage, setStatusMessage] = useState('Press Start to begin scanning');
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string; name?: string } | null>(null);

  const runningRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const playChime = (ok: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(ok ? 880 : 220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.32);
    } catch {
      // Audio not permitted — ignore
    }
  };

  const captureFrameBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        reject(new Error('Camera not ready'));
        return;
      }
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const maxDim = 640;
      const scale = Math.max(vw, vh) > maxDim ? maxDim / Math.max(vw, vh) : 1;
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Frame encode failed'))), 'image/jpeg', 0.85);
    });
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const scanLoop = async () => {
    while (runningRef.current) {
      setScanState('waiting');
      setStatusMessage('Step up and align your face in view');
      await sleep(2000);
      if (!runningRef.current) break;

      setScanState('capturing');
      setStatusMessage('Capturing...');
      const blobs: Blob[] = [];
      try {
        for (let i = 0; i < 3; i++) {
          blobs.push(await captureFrameBlob());
          await sleep(150);
        }
      } catch {
        continue;
      }
      if (!runningRef.current) break;

      setScanState('verifying');
      setStatusMessage('Identifying...');

      try {
        const formData = new FormData();
        blobs.forEach((blob, idx) => formData.append('files', blob, `frame_${idx + 1}.jpg`));
        const { data } = await api.post('/attendance/mark', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        });
        setLastResult({ ok: true, message: 'Attendance recorded', name: data?.worker_name });
        setScanState('success');
        playChime(true);
      } catch (err: any) {
        const detail =
          err?.response?.data?.detail || err?.response?.data?.message || 'Face not recognised — try again';
        setLastResult({ ok: false, message: detail });
        setScanState('error');
        playChime(false);
      }

      await sleep(3000);
    }
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      runningRef.current = true;
      setLastResult(null);
      scanLoop();
    } catch {
      setScanState('error');
      setStatusMessage('Camera permission denied or unavailable');
    }
  };

  const stop = () => {
    runningRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setScanState('idle');
    setStatusMessage('Press Start to begin scanning');
  };

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <DashboardLayout>
      <PageLayout
        title="Attendance Kiosk"
        subtitle="Leave this device running at the gate — it continuously identifies and logs whoever steps in front of the camera."
        badge="Kiosk Mode"
      >
        <div className="max-w-lg mx-auto mt-4">
          <div className="relative bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden">
            <div className="relative aspect-4/3 w-full bg-black overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform -scale-x-100"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {scanState === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-slate-400 text-sm">
                  Camera off
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
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
                  {scanState === 'capturing' && <Eye className="w-8 h-8 text-green-400 animate-bounce" />}
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3 bg-slate-900">
              <p className="text-xs text-slate-400 font-medium text-center">{statusMessage}</p>

              {lastResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    lastResult.ok
                      ? 'bg-green-950/70 border border-green-600/80 text-green-100'
                      : 'bg-red-950/70 border border-red-700/80 text-red-200'
                  }`}
                >
                  {lastResult.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold">{lastResult.ok ? lastResult.name || 'Attendance recorded' : 'Not recognised'}</p>
                    <p className="text-slate-300 mt-0.5">{lastResult.message}</p>
                  </div>
                </div>
              )}

              {scanState === 'idle' ? (
                <button
                  type="button"
                  onClick={start}
                  className="w-full btn-primary-earth py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Kiosk</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stop}
                  className="w-full btn-glass py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-slate-300 hover:text-white"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Kiosk</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
