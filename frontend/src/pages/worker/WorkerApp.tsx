import React, { useEffect, useState } from 'react';
import { ObservationForm } from './ObservationForm';
import { useSyncManager } from '../../hooks/useSyncManager';
import { getPendingObservations } from '../../utils/db';
import { Wifi, WifiOff, RefreshCw, HardHat, Camera, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { MarkAttendanceModal } from '../../components/attendance/MarkAttendanceModal';

export const WorkerApp = () => {
  // Called once here, not again in ObservationForm — it's a hook, so two call
  // sites mounted together would each get independent state and each fire
  // their own sync attempt concurrently against the same IndexedDB queue.
  const { isOnline, isSyncing, syncObservations } = useSyncManager();
  const [pendingCount, setPendingCount] = useState(0);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  // Poll for pending observations count to keep UI updated
  useEffect(() => {
    const fetchPending = async () => {
      const pending = await getPendingObservations();
      setPendingCount(pending.length);
    };

    fetchPending();
    const interval = setInterval(fetchPending, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch worker's attendance records
  const loadAttendance = async () => {
    try {
      const { data } = await api.get('/attendance/me');
      if (Array.isArray(data) && data.length > 0) {
        // Find if any record was created today
        const todayStr = new Date().toISOString().slice(0, 10);
        const recordToday = data.find((r: any) => r.created_at?.startsWith(todayStr));
        setTodayAttendance(recordToday || null);
      }
    } catch {
      // Non-critical if offline or unauthenticated
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const handleAttendanceSuccess = (result: any) => {
    setTodayAttendance(result.attendance_record || result);
    loadAttendance();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center text-white font-bold text-lg">
          <HardHat className="mr-2 text-yellow-500" />
          <span>Worker Field App</span>
        </div>
        <div className="flex items-center space-x-3">
          {pendingCount > 0 && (
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full">
              {pendingCount} pending
            </span>
          )}
          {isSyncing ? (
            <RefreshCw className="animate-spin text-blue-400" size={20} />
          ) : isOnline ? (
            <Wifi className="text-green-500" size={20} onClick={syncObservations} />
          ) : (
            <WifiOff className="text-red-500" size={20} />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-20 overflow-y-auto max-w-xl mx-auto w-full">
        {!isOnline && (
          <div className="bg-orange-900/50 border border-orange-700 text-orange-200 p-3 rounded mb-4 text-sm flex items-start">
            <WifiOff size={16} className="mt-0.5 mr-2 shrink-0" />
            <p>You are offline. Observations will be saved locally and synced when connection is restored.</p>
          </div>
        )}

        {/* Shift Attendance Card */}
        <div className="mb-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  Shift Attendance
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {todayAttendance
                  ? `Logged in at ${new Date(todayAttendance.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Mandatory daily facial biometric & geofence verification'}
              </p>
            </div>
            {todayAttendance ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/40 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Present</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                Pending Punch-In
              </span>
            )}
          </div>

          {todayAttendance && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center space-x-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{todayAttendance.mine_name || 'ECL Sector 7G'}</span>
              </div>
              <div className="text-right text-green-400">
                Perimeter: {todayAttendance.distance_from_site_m ?? 0}m OK
              </div>
            </div>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(true)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition ${
                todayAttendance
                  ? 'btn-glass text-slate-300 hover:text-white'
                  : 'btn-primary-earth text-slate-950 shadow-md'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{todayAttendance ? 'Verify / Retake Attendance' : 'Mark Attendance (Face + GPS)'}</span>
            </button>
          </div>
        </div>

        <ObservationForm isOnline={isOnline} syncObservations={syncObservations} />

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-blue-400 hover:underline">
            Return to Command Center
          </Link>
        </div>
      </main>

      {/* Attendance Modal */}
      <MarkAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        onSuccess={handleAttendanceSuccess}
      />
    </div>
  );
};

