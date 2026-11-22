import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from './api';

type SearchResult = { lat: string; lon: string; display_name: string };
type LatLng = { lat: number; lng: number };
type MapEvent = { latlng: LatLng };
type MarkerEvent = { target: { getLatLng: () => LatLng } };
type LeafletMap = {
  setView: (point: [number, number], zoom: number) => LeafletMap;
  on: (event: string, handler: (value: MapEvent) => void) => void;
  remove: () => void;
  invalidateSize: () => void;
};
type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (point: [number, number]) => LeafletMarker;
  on: (event: string, handler: (value: MarkerEvent) => void) => LeafletMarker;
};
type LeafletApi = {
  map: (node: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => unknown };
  marker: (point: [number, number], options?: Record<string, unknown>) => LeafletMarker;
};

declare global { interface Window { L?: LeafletApi } }

function loadLeaflet(): Promise<LeafletApi> {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const stylesheet = document.createElement('link');
      stylesheet.id = cssId;
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(stylesheet);
    }
    const existing = document.getElementById('leaflet-js') as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    const ready = () => window.L ? resolve(window.L) : reject(new Error('No se pudo iniciar el mapa.'));
    script.addEventListener('load', ready, { once: true });
    script.addEventListener('error', () => reject(new Error('No se pudo cargar OpenStreetMap.')), { once: true });
    if (!existing) {
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

type Props = {
  api: string;
  latitude: string;
  longitude: string;
  address: string;
  onSelect: (latitude: string, longitude: string, address?: string) => void;
};

export default function OpenMapPicker({ api, latitude, longitude, address, onSelect }: Props) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onSelectRef = useRef(onSelect);
  const [mapError, setMapError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    void loadLeaflet().then((L) => {
      if (cancelled || !mapNode.current) return;
      const currentLatitude = Number(latitude) || 9.02;
      const currentLongitude = Number(longitude) || -76.18;
      const map = L.map(mapNode.current, { scrollWheelZoom: true, zoomControl: true }).setView([currentLatitude, currentLongitude], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);
      const marker = L.marker([currentLatitude, currentLongitude], { draggable: true }).addTo(map);
      marker.on('dragend', (event) => {
        const point = event.target.getLatLng();
        onSelectRef.current(point.lat.toFixed(7), point.lng.toFixed(7), '');
      });
      map.on('click', (event) => {
        marker.setLatLng([event.latlng.lat, event.latlng.lng]);
        onSelectRef.current(event.latlng.lat.toFixed(7), event.latlng.lng.toFixed(7), '');
      });
      mapRef.current = map;
      markerRef.current = marker;
      window.setTimeout(() => map.invalidateSize(), 80);
    }).catch((error: unknown) => {
      if (!cancelled) setMapError(error instanceof Error ? error.message : 'No se pudo cargar el mapa.');
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  useEffect(() => {
    const point: [number, number] = [Number(latitude) || 9.02, Number(longitude) || -76.18];
    markerRef.current?.setLatLng(point);
  }, [latitude, longitude]);

  const searchAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchError(''); setResults([]);
    if (searchText.trim().length < 3) { setSearchError('Escribe al menos tres caracteres para buscar.'); return; }
    setSearching(true);
    try {
      const response = await apiFetch(`${api}/openmap/search?q=${encodeURIComponent(searchText.trim())}`);
      const result = await response.json() as { data?: SearchResult[]; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message || 'No se encontraron lugares.');
      if (!result.data?.length) { setSearchError('No encontramos ese punto en Puerto Escondido. Prueba con el nombre de una playa, barrio o referencia.'); return; }
      setResults(result.data);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'No se pudo completar la búsqueda.');
    } finally { setSearching(false); }
  };

  const selectResult = (result: SearchResult) => {
    onSelect(result.lat, result.lon, result.display_name.slice(0, 255));
    mapRef.current?.setView([Number(result.lat), Number(result.lon)], 17);
    setResults([]);
    setSearchError('');
  };

  return <section className="wizard-map-picker">
    <form className="wizard-map-search" onSubmit={(event) => void searchAddress(event)}>
      <label>Busca una dirección, playa o referencia<input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Ej. Playa El Pindo, Puerto Escondido" maxLength={150}/></label>
      <button type="submit" disabled={searching}>{searching ? 'Buscando…' : 'Buscar en el mapa'} <span>⌕</span></button>
    </form>
    {results.length > 0 && <div className="wizard-map-results" role="listbox" aria-label="Resultados de OpenStreetMap">{results.map((result) => <button type="button" role="option" key={`${result.lat}-${result.lon}`} onClick={() => selectResult(result)}><b>{result.display_name.split(',')[0]}</b><span>{result.display_name}</span></button>)}</div>}
    {searchError && <p className="wizard-map-error" role="status">{searchError}</p>}
    {mapError ? <div className="wizard-map-fallback"><b>{mapError}</b><p>Escribe la latitud y longitud del establecimiento para guardarlas.</p></div> : <div className="wizard-osm-map" ref={mapNode} aria-label="Mapa de OpenStreetMap. Haz clic o arrastra el marcador para elegir la ubicación."/>}
    {mapError && <div className="wizard-map-coordinates">{(['latitude', 'longitude'] as const).map((key) => <label key={key}>{key === 'latitude' ? 'Latitud' : 'Longitud'}<input type="number" step="any" value={key === 'latitude' ? latitude : longitude} onChange={(event) => onSelect(key === 'latitude' ? event.target.value : latitude, key === 'longitude' ? event.target.value : longitude)}/></label>)}</div>}
    <label className="wizard-map-address">{address ? 'Dirección o referencia seleccionada' : 'Dirección o referencia del establecimiento'}<input required minLength={5} maxLength={255} value={address} onChange={(event) => onSelect(latitude, longitude, event.target.value)} placeholder="Nombre del lugar, barrio o referencia local"/></label>
    <div className="wizard-map-selection"><span>⌖</span><div><b>Ubicación seleccionada</b><small>{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</small></div><span className="wizard-map-source">© OpenStreetMap</span></div>
    <p className="wizard-map-hint">Haz clic en el mapa o arrastra el pin hasta la entrada del establecimiento.</p>
  </section>;
}
