import React, { useEffect, useState } from 'react';
import { ObservationForm } from './ObservationForm';
import { useSyncManager } from '../../hooks/useSyncManager';
import { getPendingObservations } from '../../lib/db';
import { Wifi, WifiOff, RefreshCw, HardHat } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WorkerApp = () => {
  // Called once here, not again in ObservationForm — it's a hook, so two call
  // sites mounted together would each get independent state and each fire
  // their own sync attempt concurrently against the same IndexedDB queue.
  const { isOnline, isSyncing, syncObservations } = useSyncManager();
  const [pendingCount, setPendingCount] = useState(0);

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
      <main className="flex-1 p-4 pb-20 overflow-y-auto">
        {!isOnline && (
          <div className="bg-orange-900/50 border border-orange-700 text-orange-200 p-3 rounded mb-4 text-sm flex items-start">
            <WifiOff size={16} className="mt-0.5 mr-2 shrink-0" />
            <p>You are offline. Observations will be saved locally and synced when connection is restored.</p>
          </div>
        )}

        <ObservationForm isOnline={isOnline} syncObservations={syncObservations} />

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-blue-400 hover:underline">
            Return to Command Center
          </Link>
        </div>
      </main>
    </div>
  );
};
