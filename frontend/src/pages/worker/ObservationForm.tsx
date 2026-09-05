import React, { useRef, useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { addObservation } from '../../lib/db';
import { Save, MapPin, Mic, Square, X } from 'lucide-react';

// research/lld.md §4 Observation schema: description, photo_urls, voice_note_url, lat, lng, pillar.
// `severity` isn't part of this — it lives on Ticket, not Observation.
type Pillar = 'safety' | 'environment' | 'production' | 'labour';

const PILLARS: { value: Pillar; label: string }[] = [
  { value: 'safety', label: 'Safety (DGMS Rules)' },
  { value: 'environment', label: 'Environment (CPCB)' },
  { value: 'production', label: 'Production (EC Caps)' },
  { value: 'labour', label: 'Labour Regulations' },
];

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ObservationFormProps {
  isOnline: boolean;
  syncObservations: () => Promise<void>;
}

// isOnline/syncObservations are passed down from WorkerApp's single
// useSyncManager() call rather than calling the hook again here — see the
// comment on that call site for why a second instance is a real bug, not
// just redundant.
export const ObservationForm = ({ isOnline, syncObservations }: ObservationFormProps) => {
  const { location, loading: geoLoading } = useGeolocation();

  const [description, setDescription] = useState('');
  const [pillar, setPillar] = useState<Pillar>('safety');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    setPhotoUrls((prev) => [...prev, ...dataUrls]);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setVoiceNoteUrl(await fileToDataUrl(blob));
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // photo_urls/voice_note_url hold base64 data for now — there's no photo/audio
    // upload endpoint on the backend yet, so the raw capture is stored locally
    // until one exists. Field names match the schema either way.
    const obs = {
      description,
      pillar,
      photo_urls: photoUrls,
      voice_note_url: voiceNoteUrl,
      lat: location.latitude,
      lng: location.longitude,
      captured_at: new Date().toISOString(),
      synced: 0,
    };

    try {
      await addObservation(obs);
      setStatusMsg('Observation saved locally.');

      setDescription('');
      setPillar('safety');
      setPhotoUrls([]);
      setVoiceNoteUrl(null);

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
          <label className="block text-sm font-medium text-slate-300 mb-1">Pillar</label>
          <select
            value={pillar}
            onChange={(e) => setPillar(e.target.value as Pillar)}
            className="w-full bg-slate-800 text-white rounded p-2 border border-slate-700"
          >
            {PILLARS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-800 text-white rounded p-2 border border-slate-700 min-h-[100px]"
            placeholder="Describe the observation..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Photos</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoSelect}
            className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-slate-700 file:text-white"
          />
          {photoUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative">
                  <img
                    src={url}
                    alt={`Observation photo ${i + 1}`}
                    className="w-16 h-16 object-cover rounded border border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 bg-slate-900 border border-slate-700 rounded-full p-0.5"
                  >
                    <X size={12} className="text-slate-300" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Voice note (optional)</label>
          {!voiceNoteUrl ? (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full flex items-center justify-center py-2 px-4 rounded font-medium transition-colors text-white ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {isRecording ? (
                <Square size={16} className="mr-2" />
              ) : (
                <Mic size={16} className="mr-2" />
              )}
              {isRecording ? 'Stop recording' : 'Record voice note'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <audio controls src={voiceNoteUrl} className="flex-1 h-9" />
              <button
                type="button"
                onClick={() => setVoiceNoteUrl(null)}
                className="p-2 bg-slate-800 border border-slate-700 rounded"
              >
                <X size={14} className="text-slate-300" />
              </button>
            </div>
          )}
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

        {statusMsg && <p className="text-sm text-green-400 mt-2 text-center">{statusMsg}</p>}
      </form>
    </div>
  );
};
