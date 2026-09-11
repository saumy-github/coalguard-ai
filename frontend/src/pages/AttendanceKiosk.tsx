import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Play, Square, Camera, MapPin, User, ShieldCheck } from 'lucide-react';

import { api } from '../utils/api';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PageLayout } from '../components/common/PageLayout';

type ScanState = 'idle' | 'waiting' | 'capturing' | 'verifying' | 'success' | 'error';

export const AttendanceKioskPage = () => {
  const [workerId, setWorkerId] = useState('saumy');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMessage, setStatusMessage] = useState('Click Start Kiosk to begin scanning');
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
      setStatusMessage('Step in front of the camera and look forward');
      await sleep(2000);
      if (!runningRef.current) break;

      setScanState('capturing');
      setStatusMessage('Capturing frames...');
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
      setStatusMessage('Verifying facial identity...');

      try {
        const formData = new FormData();
        formData.append('worker_id', (workerId || 'saumy').trim().toLowerCase());
        formData.append('latitude', '23.6739');
        formData.append('longitude', '86.9524');
        formData.append('site_lat', '23.6739');
        formData.append('site_lon', '86.9524');
        blobs.forEach((blob, idx) => formData.append('files', blob, `frame_${idx + 1}.jpg`));
        const { data } = await api.post('/attendance/mark', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        });
        setLastResult({ ok: true, message: 'Attendance confirmed & logged', name: data?.worker_name || workerId });
        setScanState('success');
        playChime(true);
      } catch (err: any) {
        const detail =
          err?.response?.data?.detail || err?.response?.data?.message || 'Face not recognized — please step closer and look into camera';
        setLastResult({ ok: false, message: detail });
        setScanState('error');
        playChime(false);
      }

      await sleep(3500);
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
      setStatusMessage('Camera access denied or camera device unavailable');
    }
  };

  const stop = () => {
    runningRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setScanState('idle');
    setStatusMessage('Click Start Kiosk to begin scanning');
  };

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <DashboardLayout>
      <PageLayout
        title="Gate Attendance Kiosk"
        subtitle="Continuous hands-free gate verification for arriving miners and underground staff."
        badge="Gate Kiosk"
      >
        <div className="max-w-xl mx-auto mt-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            
            {/* Viewfinder */}
            <div className="relative aspect-4/3 w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform -scale-x-100"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {scanState === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 text-zinc-400 text-sm gap-2">
                  <Camera className="w-8 h-8 text-zinc-500" />
                  <span>Kiosk camera is currently idle</span>
                </div>
              )}

              {scanState !== 'idle' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-48 h-60 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center ${
                      scanState === 'capturing'
                        ? 'border-emerald-400 scale-102 bg-emerald-500/5'
                        : scanState === 'verifying'
                        ? 'border-blue-400 animate-pulse bg-blue-500/5'
                        : scanState === 'error'
                        ? 'border-red-400 bg-red-500/5'
                        : scanState === 'success'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-400/50'
                    }`}
                  />
                  
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-zinc-200 bg-black/70 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>ECL Sector 7G Gate Kiosk</span>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Auto-Scan Active
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls & Feedback */}
            <div className="p-5 space-y-4 bg-zinc-900">
              <p className="text-xs text-zinc-400 font-medium text-center">{statusMessage}</p>

              {lastResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    lastResult.ok
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'
                      : 'bg-red-500/10 border border-red-500/20 text-red-200'
                  }`}
                >
                  {lastResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-white">{lastResult.ok ? lastResult.name || 'Attendance Logged' : 'Verification Unsuccessful'}</p>
                    <p className="text-zinc-300 mt-0.5">{lastResult.message}</p>
                  </div>
                </div>
              )}

              {scanState === 'idle' && (
                <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs">
                  <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Worker ID for Demo:</span>
                  </span>
                  <input
                    type="text"
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    placeholder="e.g. saumy"
                    className="bg-zinc-900 border border-zinc-700 text-white px-2.5 py-1 rounded-lg text-xs w-32 text-right focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {scanState === 'idle' ? (
                <button
                  type="button"
                  onClick={start}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-600/20"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Gate Kiosk</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stop}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Gate Kiosk</span>
                </button>
              )}
            </div>

            <div className="px-5 py-2.5 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Automated Face Verification</span>
              </span>
              <span>CoalGuard Gate Unit</span>
            </div>

          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
