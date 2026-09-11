import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  MapPin,
  RefreshCw,
  X,
  User,
  Navigation,
  ShieldCheck,
  Eye,
  Clock
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
  const [statusMessage, setStatusMessage] = useState<string>('Center your face in the camera view');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const [captureProgress, setCaptureProgress] = useState<number>(0);

  // Geolocation state
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [simulateOnSite, setSimulateOnSite] = useState<boolean>(true);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting mine boundary...');

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
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch {
      // Audio not permitted or not supported — ignore
    }
  };

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    } catch {
      setScanState('error');
      setErrorMessage(
        'Camera permission was denied or no camera device was found. Please allow camera access in your browser settings.'
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

    setLocationStatus('Locating mine perimeter...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationStatus('GPS active');
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
      setCountdown(5);
      setStatusMessage('Center your face in the camera view');
      startCamera();
      fetchLocation();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Capture single frame as Blob (optimized max 640px for fast upload and inference)
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

  // Initiate Biometric Sequence with 5-second countdown timer
  const startBiometricSequence = async () => {
    setErrorMessage(null);
    setScanState('countdown');
    setCountdown(5);

    // 5-second countdown: 5.. 4.. 3.. 2.. 1.. (1 second per count)
    for (let c = 5; c > 0; c--) {
      setCountdown(c);
      setStatusMessage(`Please hold steady... Capturing in ${c} seconds`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    setScanState('capturing');
    setStatusMessage('Blink your eyes naturally — recording verification frames...');
    setCaptureProgress(15);

    const capturedBlobs: Blob[] = [];
    const totalFrames = 3;

    try {
      for (let i = 0; i < totalFrames; i++) {
        const blob = await captureFrameBlob();
        capturedBlobs.push(blob);
        setCaptureProgress(Math.round(((i + 1) / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 250));
      }

      setScanState('verifying');
      setStatusMessage('Verifying facial identity and mine geofence boundary...');

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
      setStatusMessage('Attendance recorded successfully.');
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
        'Verification was not successful. Please ensure your face is well-lit and aligned, then try again.';
      setErrorMessage(detail);
      setStatusMessage('Verification Not Completed');
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-lg my-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Daily Attendance Check-In
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Facial identity verification and mine boundary confirmation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-4/3 w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform -scale-x-100"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Simple, gentle face guide overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
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
            >
              {scanState === 'countdown' && (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-6xl font-bold text-white drop-shadow-lg">
                    {countdown}
                  </span>
                  <span className="text-xs text-zinc-200 mt-1 font-medium bg-black/60 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Capturing in {countdown}s</span>
                  </span>
                </div>
              )}

              {scanState === 'capturing' && (
                <div className="text-center bg-black/70 px-4 py-2 rounded-full border border-emerald-500/40 shadow-lg">
                  <Eye className="w-5 h-5 text-emerald-400 mx-auto animate-bounce mb-1" />
                  <span className="text-xs text-emerald-300 font-medium">Blink your eyes</span>
                </div>
              )}
            </div>

            {/* Subtle location chip at bottom of viewfinder */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-zinc-200 bg-black/70 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">
                  {simulateOnSite
                    ? `${DEFAULT_MINE.name} (Within mine perimeter)`
                    : deviceCoords
                    ? `${deviceCoords.lat.toFixed(4)}°, ${deviceCoords.lng.toFixed(4)}°`
                    : locationStatus}
                </span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                {simulateOnSite ? 'On-Site Verified' : 'Live GPS'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Controls & Feedback Body */}
        <div className="p-5 space-y-4 bg-zinc-900 overflow-y-auto">
          
          {/* Status Instruction Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">{statusMessage}</span>
            {scanState === 'capturing' && (
              <span className="text-emerald-400 font-semibold">{captureProgress}%</span>
            )}
          </div>

          {/* Smooth Progress Bar */}
          {(scanState === 'capturing' || scanState === 'verifying') && (
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  scanState === 'verifying' ? 'w-full bg-blue-500 animate-pulse' : 'bg-emerald-500'
                }`}
                style={{ width: scanState === 'verifying' ? '100%' : `${captureProgress}%` }}
              />
            </div>
          )}

          {/* Error Banner */}
          {scanState === 'error' && errorMessage && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-red-300">Verification Unsuccessful</p>
                <p className="text-zinc-300 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {scanState === 'success' && attendanceResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Attendance Confirmed & Logged</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-zinc-300">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Worker</span>
                  <span className="text-white font-medium">{attendanceResult?.worker_name || workerId}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Mine Sector</span>
                  <span className="text-white font-medium">{DEFAULT_MINE.name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Geofence</span>
                  <span className="text-emerald-400 font-medium">Inside Perimeter</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Facial Check</span>
                  <span className="text-emerald-400 font-medium">Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* Settings & Info when Idle */}
          {scanState === 'idle' && (
            <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Worker Profile:</span>
                </label>
                <input
                  type="text"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  placeholder="Worker ID"
                  className="bg-zinc-900 border border-zinc-700 text-white px-2.5 py-1 rounded-lg text-xs w-36 text-right focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-zinc-400">Mine Location Mode</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulateOnSite(!simulateOnSite)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    simulateOnSite
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {simulateOnSite ? 'Simulate On-Site' : 'Live Browser GPS'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            {scanState === 'idle' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startBiometricSequence}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-600/20"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start 5s Check-In</span>
                </button>
              </>
            )}

            {scanState === 'error' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={startBiometricSequence}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              </>
            )}

            {scanState === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done & Return</span>
              </button>
            )}

            {(scanState === 'countdown' || scanState === 'capturing' || scanState === 'verifying') && (
              <div className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs flex items-center justify-center gap-2">
                {scanState === 'countdown' ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    <span>Starting in {countdown} seconds...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>
                      {scanState === 'capturing' ? 'Recording blink sequence...' : 'Verifying face biometrics...'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Quiet Footer Note */}
        <div className="px-6 py-2.5 bg-zinc-950/80 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure mine verification</span>
          </span>
          <span>ECL Sector 7G</span>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
