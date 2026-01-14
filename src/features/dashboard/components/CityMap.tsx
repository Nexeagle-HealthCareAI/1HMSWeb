
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon not showing correctly in React
// We use a custom icon for each marker to avoid global prototype issues that cause crashes
const customIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Coordinates for the known cities in our dataset
const CITY_COORDINATES: Record<string, [number, number]> = {
    "Kishanganj": [26.1068, 87.9510],
    "Purnea": [25.7771, 87.4753],
    "Siliguri": [26.7271, 88.3953],
    "Kolkata": [22.5726, 88.3639],
    "Patna": [25.5941, 85.1376],
    "Darjeeling": [27.0360, 88.2627],
    "Malda": [25.0108, 88.1411],
    "Raiganj": [25.6329, 88.1318]
};

interface CityMapProps {
    data: Record<string, number>;
    className?: string;
}

export const CityMap: React.FC<CityMapProps> = ({ data, className }) => {
    // Default center roughly focusing on Bihar/West Bengal region
    const centerPosition: [number, number] = [25.5, 87.5];

    return (
        <div className={`h-full w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 ${className}`}>
            <MapContainer
                center={centerPosition}
                zoom={7}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%', minHeight: '100%' }}
                className="z-10"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {Object.entries(data).map(([city, count]) => {
                    const position = CITY_COORDINATES[city];
                    if (!position) return null;

                    return (
                        <Marker key={city} position={position} icon={customIcon}>
                            <Popup>
                                <div className="text-center p-1">
                                    <h3 className="font-bold text-sm text-gray-800">{city}</h3>
                                    <p className="text-xs text-gray-600">{count.toLocaleString()} Visits</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};
