
"use client";
import React, { useEffect, useState, useMemo } from 'react';
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

interface MapProps {
    pickup: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    boatId: string;
}

// Custom hook to set map view
const ChangeView = ({ center, zoom }: { center: L.LatLngExpression, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [map, center, zoom]);
    return null;
}

export function InteractiveMap({ pickup, destination }: MapProps) {
    const [route, setRoute] = useState<L.LatLngExpression[]>([]);
    const orsApiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;

    useEffect(() => {
        if (!orsApiKey) {
            console.error("OpenRouteService API key is missing.");
            return;
        }
        
        const fetchRoute = async () => {
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
                if (data.routes && data.routes.length > 0) {
                    const routeCoordinates = data.routes[0].geometry.map((coord: [number, number]) => [coord[1], coord[0]]); // Swap lng,lat to lat,lng
                    setRoute(routeCoordinates);
                }

            } catch (error) {
                console.error("Error fetching route from OpenRouteService:", error);
            }
        };

        if (pickup && destination) {
            fetchRoute();
        }
    }, [pickup.lat, pickup.lng, destination.lat, destination.lng, orsApiKey]);

    const center = useMemo(() => [pickup.lat, pickup.lng] as L.LatLngExpression, [pickup.lat, pickup.lng]);

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
