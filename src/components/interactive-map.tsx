
"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issue with Leaflet and Webpack
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl.src,
    iconUrl: iconUrl.src,
    shadowUrl: shadowUrl.src,
});

const orsApiKey = '5b3ce3597851110001cf6248dff9616173c544c686f0525985918410';

interface MapProps {
    pickup: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    boatId: string;
}

// Custom hook to set map view
const ChangeView = ({ center, zoom }: { center: L.LatLngExpression, zoom: number }) => {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

export function InteractiveMap({ pickup, destination }: MapProps) {
    const [route, setRoute] = useState<L.LatLngExpression[]>([]);
    
    useEffect(() => {
        const fetchRoute = async () => {
            const start = `${pickup.lng},${pickup.lat}`;
            const end = `${destination.lng},${destination.lat}`;
            
            try {
                const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
                    method: 'POST',
                    headers: {
                        'Authorization': orsApiKey,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
                    },
                    body: JSON.stringify({
                        "coordinates": [[pickup.lng, pickup.lat], [destination.lng, destination.lat]]
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`ORS request failed: ${response.status} ${errorText}`);
                }

                const data = await response.json();
                const routeCoordinates = data.routes[0].geometry.map((coord: [number, number]) => [coord[1], coord[0]]); // Swap lng,lat to lat,lng
                setRoute(routeCoordinates);

            } catch (error) {
                console.error("Error fetching route from OpenRouteService:", error);
            }
        };

        if (pickup && destination) {
            fetchRoute();
        }
    }, [pickup, destination]);

    const center: L.LatLngExpression = [pickup.lat, pickup.lng];

    return (
       <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
         <ChangeView center={center} zoom={12} />
        <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[pickup.lat, pickup.lng]} title="Pickup"></Marker>
        <Marker position={[destination.lat, destination.lng]} title="Destination"></Marker>
        {route.length > 0 && <Polyline positions={route} color="blue" />}
       </MapContainer>
    );
};
