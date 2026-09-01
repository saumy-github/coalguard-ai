import { useEffect, useState } from 'react';
import { getPendingObservations, markObservationSynced } from '../lib/db';

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
          // Send to backend via native fetch
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/observations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(obs),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to sync observation: ${response.statusText}`);
          }
          
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

