
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
    // West Bengal
    "Kolkata": [22.5726, 88.3639],
    "Siliguri": [26.7271, 88.3953],
    "Darjeeling": [27.0360, 88.2627],
    "Malda": [25.0108, 88.1411],
    "Raiganj": [25.6329, 88.1318],
    "Asansol": [23.6739, 86.9524],
    "Durgapur": [23.5204, 87.3119],
    "Kharagpur": [22.3302, 87.3237],
    "Howrah": [22.5958, 88.2636],
    "Jalpaiguri": [26.5407, 88.7193],
    "Cooch Behar": [26.3157, 89.4378],
    "Alipurduar": [26.4918, 89.5271],
    "Bardhaman": [23.2324, 87.8615],
    "Murshidabad": [24.1759, 88.2802],
    "Hooghly": [22.9030, 88.3734],
    "Nadia": [23.4710, 88.5565],
    "Birbhum": [23.8404, 87.6186],
    "Purulia": [23.3321, 86.3652],
    "Bankura": [23.2356, 87.0784],
    "Haldia": [22.0667, 88.0691],

    // Bihar
    "Patna": [25.5941, 85.1376],
    "Gaya": [24.7914, 85.0002],
    "Bhagalpur": [25.2425, 87.0111],
    "Muzaffarpur": [26.1197, 85.3910],
    "Purnea": [25.7771, 87.4753],
    "Kishanganj": [26.1068, 87.9510],
    "Darbhanga": [26.1542, 85.8918],
    "Begusarai": [25.4182, 86.1272],
    "Katihar": [25.5461, 87.5720],
    "Munger": [25.3748, 86.4735],
    "Chapra": [25.8770, 84.7335],
    "Arrah": [25.5560, 84.6603],
    "Sasaram": [24.9490, 84.0153],
    "Hajipur": [25.6858, 85.2146],
    "Samastipur": [25.8630, 85.7811],
    "Siwan": [26.2243, 84.3600],
    "Motihari": [26.6528, 84.9189],
    "Bettiah": [26.7998, 84.5028],
    "Saharsa": [25.8835, 86.6006],
    "Saran": [25.8770, 84.7335],
    "Bhojpur": [25.5560, 84.6603],

    // Jharkhand
    "Ranchi": [23.3441, 85.3096],
    "Jamshedpur": [22.8046, 86.2029],
    "Dhanbad": [23.7957, 86.4304],
    "Bokaro": [23.6693, 86.1511],
    "Deoghar": [24.4826, 86.6945],
    "Hazaribagh": [23.9984, 85.3704],

    // Major Metros
    "Delhi": [28.6139, 77.2090],
    "New Delhi": [28.6139, 77.2090],
    "Mumbai": [19.0760, 72.8777],
    "Bangalore": [12.9716, 77.5946],
    "Bengaluru": [12.9716, 77.5946],
    "Chennai": [13.0827, 80.2707],
    "Hyderabad": [17.3850, 78.4867],
    "Ahmedabad": [23.0225, 72.5714],
    "Pune": [18.5204, 73.8567]
};

interface CityMapProps {
    data: Record<string, number>;
    cities?: string[];
    className?: string;
}

export const CityMap: React.FC<CityMapProps> = ({ data, cities, className }) => {
    // Default center roughly focusing on Bihar/West Bengal region
    const centerPosition: [number, number] = [25.5, 87.5];

    // Use provided cities list or fall back to keys from data
    const citiesToList = cities || Object.keys(data);

    // Helpers to find best match
    const getCoordinates = (cityName: string): { position: [number, number]; isApproximate: boolean; matchedName: string } => {
        const normalizedInput = cityName.trim().toLowerCase();

        // 1. Exact match
        if (CITY_COORDINATES[cityName]) return { position: CITY_COORDINATES[cityName], isApproximate: false, matchedName: cityName };

        // 2. Case insensitive match
        const caseKey = Object.keys(CITY_COORDINATES).find(key => key.toLowerCase() === normalizedInput);
        if (caseKey) return { position: CITY_COORDINATES[caseKey], isApproximate: false, matchedName: caseKey };

        // 3. Substring match (Input contains Key OR Key contains Input)
        // Prefer longer matches to be more specific (e.g. 'New Delhi' over 'Delhi' if input is 'New Delhi Area')
        const substringKey = Object.keys(CITY_COORDINATES)
            .sort((a, b) => b.length - a.length)
            .find(key => normalizedInput.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedInput));

        if (substringKey) return { position: CITY_COORDINATES[substringKey], isApproximate: true, matchedName: substringKey };

        // 4. Fallback: Return a predictable random position near center to prevent overlap
        // Hash string to number
        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
            hash = ((hash << 5) - hash) + cityName.charCodeAt(i);
            hash |= 0;
        }

        // Offset by +/- 1 degree based on hash to scatter them near center
        const latOffset = (hash % 100) / 100;
        const lngOffset = ((hash >> 8) % 100) / 100;

        return {
            position: [centerPosition[0] + latOffset, centerPosition[1] + lngOffset],
            isApproximate: true,
            matchedName: 'Unknown Location'
        };
    };

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
                {citiesToList.map((city) => {
                    const { position, isApproximate, matchedName } = getCoordinates(city);
                    const count = data[city] || 0;

                    return (
                        <Marker key={city} position={position} icon={customIcon}>
                            <Popup>
                                <div className="text-center p-1">
                                    <h3 className="font-bold text-sm text-gray-800">{city}</h3>
                                    {isApproximate && matchedName !== 'Unknown Location' && (
                                        <p className="text-[10px] text-amber-600 mb-0.5">(Mapped to {matchedName})</p>
                                    )}
                                    {matchedName === 'Unknown Location' && (
                                        <p className="text-[10px] text-red-500 mb-0.5">(Approximate Location)</p>
                                    )}
                                    <p className="text-xs text-gray-600 font-medium">{count.toLocaleString()} Visits</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};
