import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// India's rough geographic center -- used only as the map's starting viewport when no
// coordinates have been set yet, so the picker doesn't open zoomed out over the ocean at (0,0).
const DEFAULT_CENTER: [number, number] = [78.9629, 20.5937];
const DEFAULT_ZOOM = 4;
const PIN_ZOOM = 15;

interface GeocodeSuggestion {
  id: string;
  placeName: string;
  center: [number, number]; // [lng, lat]
}

interface MapLocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

// Combined address-search + draggable-pin map for capturing a hospital/lab's GPS location.
// Falls back to plain numeric lat/lng inputs (no map) if VITE_MAPBOX_TOKEN isn't configured,
// so this never blocks saving a location -- it only makes the common case nicer.
export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  latitude,
  longitude,
  onLocationChange,
  disabled = false,
  searchPlaceholder = 'Search for an address or place...',
  className
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextFlyToRef = useRef(false);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';

  // Initialize the map once.
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: hasCoordinates ? [longitude as number, latitude as number] : DEFAULT_CENTER,
        zoom: hasCoordinates ? PIN_ZOOM : DEFAULT_ZOOM
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current = map;

      const marker = new mapboxgl.Marker({ draggable: !disabled, color: '#2563eb' });
      if (hasCoordinates) {
        marker.setLngLat([longitude as number, latitude as number]).addTo(map);
      }
      markerRef.current = marker;

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat();
        suppressNextFlyToRef.current = true;
        onLocationChange(lat, lng);
      });

      map.on('click', (e) => {
        if (disabled) return;
        marker.setLngLat(e.lngLat).addTo(map);
        suppressNextFlyToRef.current = true;
        onLocationChange(e.lngLat.lat, e.lngLat.lng);
      });

      return () => {
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
      };
    } catch {
      setMapError('Could not load the map. You can still enter coordinates manually below.');
    }
    // Intentionally run once -- lat/lng/disabled changes are handled by the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker/viewport in sync when coordinates change from outside this component
  // (e.g. the "Use my current location" button, or an initial fetch from the server).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    if (!hasCoordinates) return;

    marker.setLngLat([longitude as number, latitude as number]);
    if (!marker.getElement().isConnected) {
      marker.addTo(map);
    }

    if (suppressNextFlyToRef.current) {
      // This update originated from a drag/click on the map itself -- it's already centered there.
      suppressNextFlyToRef.current = false;
      return;
    }
    map.flyTo({ center: [longitude as number, latitude as number], zoom: Math.max(map.getZoom(), PIN_ZOOM), duration: 800 });
  }, [latitude, longitude, hasCoordinates]);

  // Keep marker draggability in sync with the parent form's edit/disabled state.
  useEffect(() => {
    markerRef.current?.setDraggable(!disabled);
  }, [disabled]);

  const runSearch = (text: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text.trim() || !MAPBOX_TOKEN) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        const results: GeocodeSuggestion[] = (data?.features ?? []).map((f: any) => ({
          id: f.id,
          placeName: f.place_name,
          center: f.center
        }));
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: GeocodeSuggestion) => {
    const [lng, lat] = suggestion.center;
    setQuery(suggestion.placeName);
    setShowSuggestions(false);
    setSuggestions([]);
    onLocationChange(lat, lng);
  };

  const handleManualCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
    const parsed = value.trim() === '' ? NaN : Number(value);
    if (Number.isNaN(parsed)) return;
    if (field === 'latitude') {
      onLocationChange(parsed, typeof longitude === 'number' ? longitude : 0);
    } else {
      onLocationChange(typeof latitude === 'number' ? latitude : 0, parsed);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {MAPBOX_TOKEN ? (
        <>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                  runSearch(e.target.value);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={searchPlaceholder}
                disabled={disabled}
                className="h-10 pl-9 pr-9 rounded-xl"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showSuggestions && (isSearching || suggestions.length > 0) && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
                {isSearching && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
                )}
                {!isSearching &&
                  suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {s.placeName}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div
            ref={mapContainerRef}
            onClick={() => setShowSuggestions(false)}
            className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800"
          />
          {!hasCoordinates && (
            <p className="text-[10px] text-muted-foreground">
              Search for an address, click the map, or use "Use my current location" above to drop a pin.
            </p>
          )}
        </>
      ) : (
        <p className="text-[10px] text-amber-600 dark:text-amber-500">
          {mapError ?? 'Map preview unavailable (no Mapbox token configured) -- coordinates can still be entered manually below.'}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="number"
          step="any"
          value={latitude ?? ''}
          onChange={(e) => handleManualCoordinateChange('latitude', e.target.value)}
          placeholder="Latitude"
          disabled={disabled}
          className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
        />
        <Input
          type="number"
          step="any"
          value={longitude ?? ''}
          onChange={(e) => handleManualCoordinateChange('longitude', e.target.value)}
          placeholder="Longitude"
          disabled={disabled}
          className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
        />
      </div>
    </div>
  );
};

export default MapLocationPicker;
