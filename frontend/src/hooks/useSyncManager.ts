import { useEffect, useState } from 'react';
import { getPendingObservations, markObservationSynced } from '../utils/db';
import { api } from '../utils/api';

export const useSyncManager = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncObservations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try syncing on mount if online
    if (navigator.onLine) {
      syncObservations();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncObservations = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const pending = await getPendingObservations();

      for (const obs of pending) {
        try {
          // id/synced are local IndexedDB bookkeeping only — not part of the
          // wire schema (backend/src/schemas/inspections.py ObservationIn).
          // `api` (axios, see lib/api.ts) attaches the Bearer token itself;
          // this used to be a bare fetch with no auth header at all, against
          // a path (/api/observations) the backend never had.
          const { id, synced, ...payload } = obs;
          await api.post('/inspections/observations', payload);

          if (obs.id) {
            await markObservationSynced(obs.id);
          }
        } catch (err) {
          console.error('Failed to sync observation:', obs.id, err);
          // If one fails, we might still want to try others, or break early.
          // For now, continue trying others.
        }
      }
    } catch (err) {
      console.error('Error in sync process', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return { isOnline, isSyncing, syncObservations };
};
