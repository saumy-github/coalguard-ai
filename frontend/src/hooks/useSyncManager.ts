import { useEffect, useState } from 'react';
import { getPendingIssueReports, markIssueReportSynced } from '../utils/db';
import { api } from '../utils/api';

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export const useSyncManager = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncIssueReports();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try syncing on mount if online
    if (navigator.onLine) {
      syncIssueReports();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncIssueReports = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const pending = await getPendingIssueReports();

      for (const report of pending) {
        try {
          const formData = new FormData();
          formData.append('observation', report.observation);
          formData.append('level', report.level);
          formData.append('section', String(report.section));
          if (report.photo_data_url) {
            const blob = await dataUrlToBlob(report.photo_data_url);
            formData.append('photo', blob, 'photo.jpg');
          }

          // POST /issues (backend/src/routes/issues.py) — AI-routed, may
          // return null if classification is still pending/failed; either
          // way the report was received, so it's safe to mark synced.
          await api.post('/issues', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          if (report.id) {
            await markIssueReportSynced(report.id);
          }
        } catch (err) {
          console.error('Failed to sync issue report:', report.id, err);
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

  return { isOnline, isSyncing, syncIssueReports };
};
