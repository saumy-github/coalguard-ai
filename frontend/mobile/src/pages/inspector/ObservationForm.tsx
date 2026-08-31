import React, { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { addObservation } from '../../lib/db';
import { useSyncManager } from '../../hooks/useSyncManager';
import { Save, MapPin } from 'lucide-react';

export const ObservationForm = () => {
  const { location, loading: geoLoading } = useGeolocation();
  const { isOnline, syncObservations } = useSyncManager();
  
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('Safety');
  const [severity, setSeverity] = useState('Low');
  const [statusMsg, setStatusMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const obs = {
      notes,
      category,
      severity,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date().toISOString(),
      synced: 0,
    };

    try {
      await addObservation(obs);
      setStatusMsg('Observation saved locally.');
      
      setNotes('');
      setCategory('Safety');
      setSeverity('Low');

      if (isOnline) {
        await syncObservations();
        setStatusMsg('Observation synced to server.');
      }
    } catch (err) {
      console.error(err);
      setStatusMsg('Error saving observation.');
    }
    
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-900 rounded-lg shadow border border-slate-800">
      <h2 className="text-xl font-bold text-white mb-4">New Observation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-800 text-white rounded p-2 border border-slate-700"
          >
            <option value="Safety">Safety (DGMS Rules)</option>
            <option value="Environment">Environment (CPCB)</option>
            <option value="Production">Production (EC Caps)</option>
            <option value="Labour">Labour Regulations</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Severity</label>
          <select 
            value={severity} 
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full bg-slate-800 text-white rounded p-2 border border-slate-700"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-800 text-white rounded p-2 border border-slate-700 min-h-[100px]"
            placeholder="Describe the observation..."
            required
          />
        </div>

        <div className="flex items-center text-sm text-slate-400">
          <MapPin size={16} className="mr-1" />
          {geoLoading ? (
            'Locating...'
          ) : location.latitude ? (
            `${location.latitude.toFixed(6)}, ${location.longitude?.toFixed(6)}`
          ) : (
            'Location unavailable'
          )}
        </div>

        <button 
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center transition-colors"
        >
          <Save size={18} className="mr-2" />
          Save Observation
        </button>

        {statusMsg && (
          <p className="text-sm text-green-400 mt-2 text-center">{statusMsg}</p>
        )}
      </form>
    </div>
  );
};

