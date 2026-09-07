import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { api } from '../utils/api';

// Vite serves node_modules images as plain URLs, but Leaflet's default icon
// asset paths break under any bundler unless re-pointed at those URLs directly.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface PublicMine {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

const INDIA_CENTER: [number, number] = [22.9734, 78.6569];

interface IndiaMineMapProps {
  height?: number;
  zoom?: number;
}

// Standalone, reusable — plots every mine from the public, unauthenticated
// /mines/public endpoint. Used on the landing page today; safe to reuse on
// a dedicated page or elsewhere without any change.
export const IndiaMineMap = ({ height = 420, zoom = 5 }: IndiaMineMapProps) => {
  const [mines, setMines] = useState<PublicMine[]>([]);

  useEffect(() => {
    api.get<PublicMine[]>('/mines/public')
      .then(({ data }) => setMines(data))
      .catch(() => setMines([]));
  }, []);

  return (
    <div className="glass-panel overflow-hidden" style={{ height }}>
      <MapContainer center={INDIA_CENTER} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mines.filter((m) => m.lat !== null && m.lng !== null).map((mine) => (
          <Marker key={mine.id} position={[mine.lat as number, mine.lng as number]}>
            <Popup>{mine.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
