import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Eye,
  RefreshCw,
  X,
  Crosshair,
  UserCheck,
  Navigation,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

import { api } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

// Default mine site: ECL Sector 7G (Asansol)
const DEFAULT_MINE = {
  name: 'ECL Sector 7G',
  lat: 23.6739,
  lng: 86.9524,
};

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (record: any) => void;
}

type ScanState = 'idle' | 'countdown' | 'capturing' | 'verifying' | 'success' | 'error';

export const MarkAttendanceModal: React.FC<MarkAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const user = useAuthStore((state) => state.user);

  // Determine initial worker_id
  const getInitialWorkerId = () => {
    if (!user) return 'saumy';
    const name = (user.full_name || '').toLowerCase();
    if (name.includes('saumy')) return 'saumy';
    return name.replace(/\s+/g, '_') || 'saumy';
  };

  const [workerId, setWorkerId] = useState(getInitialWorkerId());
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Align your face in the oval guide');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [captureProgress, setCaptureProgress] = useState<number>(0);

  // Geolocation state
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [simulateOnSite, setSimulateOnSite] = useState<boolean>(true); // Default to on-site for demo/presentation ease
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');

  // Result state
  const [attendanceResult, setAttendanceResult] = useState<any>(null);

  // Video & Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Sound chime helper using Web Audio API
  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.12); // A5
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

  // Start Camera Stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 720 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setScanState('error');
      setErrorMessage(
        'Camera permission denied or camera not found. Please enable camera access in your browser settings.'
      );
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Fetch Device Geolocation
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation unsupported on this device');
      return;
    }

    setLocationStatus('Acquiring GPS signal...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationStatus('GPS Acquired');
      },
      (err) => {
        setLocationStatus(`GPS unavailable (${err.message}). Using mine site simulation.`);
        setSimulateOnSite(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      setWorkerId(getInitialWorkerId());
      setScanState('idle');
      setErrorMessage(null);
      setAttendanceResult(null);
      setCaptureProgress(0);
      setStatusMessage('Align your face in the oval guide');
      startCamera();
      fetchLocation();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Capture single frame as Blob (optimized to max 640px for fast upload and inference)
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
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas frame encoding failed'));
          }
        },
        'image/jpeg',
        0.85
      );
    });
  };

  // Initiate Biometric Sequence
  const startBiometricSequence = async () => {
    setErrorMessage(null);
    setScanState('countdown');
    setCountdown(3);

    // 3.. 2.. 1.. Countdown
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
      // Capture 3 frames across ~600ms to capture natural blink motion
      for (let i = 0; i < totalFrames; i++) {
        const blob = await captureFrameBlob();
        capturedBlobs.push(blob);
        setCaptureProgress(Math.round(((i + 1) / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 200));
      }

      // Step: Verifying via Backend & AI Engine
      setScanState('verifying');
      setStatusMessage('Analyzing Geofence & Liveness & FaceNet Biometrics...');

      // Determine coordinates
      const effectiveLat = simulateOnSite ? DEFAULT_MINE.lat : (deviceCoords?.lat ?? DEFAULT_MINE.lat);
      const effectiveLng = simulateOnSite ? DEFAULT_MINE.lng : (deviceCoords?.lng ?? DEFAULT_MINE.lng);

      const formData = new FormData();
      formData.append('worker_id', workerId.trim().toLowerCase());
      formData.append('latitude', effectiveLat.toString());
      formData.append('longitude', effectiveLng.toString());
      formData.append('site_lat', DEFAULT_MINE.lat.toString());
      formData.append('site_lon', DEFAULT_MINE.lng.toString());

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
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
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
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                Geo-Fenced Face Attendance
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


        {/* Viewfinder Section */}
        <div className="relative aspect-4/3 w-full bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform -scale-x-100" // Mirrored view for natural selfie
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* HUD Target Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-400/70" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-400/70" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-400/70" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-400/70" />

            {/* Oval Face Reticle */}
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
                <span className="text-6xl font-black text-amber-400 font-mono animate-ping">
                  {countdown}
                </span>
              )}
              {scanState === 'capturing' && (
                <div className="text-center bg-black/60 px-3 py-1 rounded-full border border-green-500/50">
                  <Eye className="w-6 h-6 text-green-400 mx-auto animate-bounce" />
                  <span className="text-xs text-green-300 font-mono font-bold">BLINK EYES</span>
                </div>
              )}
            </div>

            {/* Scanning Laser Animation during verification */}
            {scanState === 'verifying' && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_1.5s_infinite]" />
            )}

            {/* Top HUD Banner */}
            <div className="absolute top-3 left-0 right-0 flex justify-center">
              <span className="text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-amber-300 uppercase">
                {scanState === 'verifying' ? 'Neural Matcher Active' : 'FaceNet + MediaPipe Mesh'}
              </span>
            </div>

            {/* Bottom HUD Banner */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {simulateOnSite
                    ? `${DEFAULT_MINE.name} (0 m - Inside Boundary)`
                    : deviceCoords
                    ? `${deviceCoords.lat.toFixed(4)}°, ${deviceCoords.lng.toFixed(4)}°`
                    : locationStatus}
                </span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                  simulateOnSite
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {simulateOnSite ? 'ON-SITE GEOFENCE' : 'GPS LIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 bg-slate-900">
          {/* Status / Instruction text */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">{statusMessage}</span>
            {scanState === 'capturing' && (
              <span className="font-mono text-green-400 font-bold">{captureProgress}%</span>
            )}
          </div>

          {/* Progress Bar */}
          {(scanState === 'capturing' || scanState === 'verifying') && (
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  scanState === 'verifying'
                    ? 'w-full bg-cyan-400 animate-pulse'
                    : 'bg-amber-500'
                }`}
                style={{ width: scanState === 'verifying' ? '100%' : `${captureProgress}%` }}
              />
            </div>
          )}

          {/* Error State Banner */}
          {scanState === 'error' && errorMessage && (
            <div className="p-3 bg-red-950/70 border border-red-700/80 rounded-xl text-red-200 text-xs flex items-start space-x-2 animate-shake">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Verification Refused</p>
                <p className="text-slate-300 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success State Banner */}
          {scanState === 'success' && attendanceResult && (
            <div className="p-3.5 bg-green-950/70 border border-green-600/80 rounded-xl text-green-100 text-xs space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <span className="font-bold text-sm text-green-300">
                  Punch-In Verified & Logged
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300 font-mono text-[11px] border-t border-green-800/40">
                <div>
                  <span className="text-slate-400 block">Worker:</span>
                  <span className="text-white font-bold">{workerId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Mine Site:</span>
                  <span className="text-white">{DEFAULT_MINE.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Perimeter:</span>
                  <span className="text-green-400">
                    {attendanceResult?.attendance_record?.distance_from_site_m ?? 0} m (Within 100m)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Liveness:</span>
                  <span className="text-green-400">Blink Confirmed</span>
                </div>
              </div>
            </div>
          )}

          {/* Settings & Simulation Controls */}
          {scanState === 'idle' && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Worker Identifier:</span>
                </label>
                <input
                  type="text"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  placeholder="e.g. saumy"
                  className="bg-slate-900 border border-slate-700 text-white px-2.5 py-1 rounded text-xs w-32 text-right font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Geofence Mode Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <div className="flex items-center space-x-1.5">
                  <Navigation className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-slate-300 font-medium block">Mine Geofence Mode</span>
                    <span className="text-[10px] text-slate-500">
                      {simulateOnSite ? 'Simulating ECL Sector 7G site coords' : 'Using real browser GPS'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulateOnSite(!simulateOnSite)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    simulateOnSite
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {simulateOnSite ? 'Simulate On-Site' : 'Live Device GPS'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
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
                <span>
                  {scanState === 'capturing' ? 'Recording Eye Blink...' : 'Processing Verification...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer info note */}
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
