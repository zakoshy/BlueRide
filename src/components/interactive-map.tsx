
"use client";
import React, { useEffect, useRef } from 'react';
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

export function InteractiveMap({ pickup, destination }: MapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Ensure this effect runs only once on the client
        if (typeof window === 'undefined' || !mapContainerRef.current) return;

        // Check if map is already initialized
        if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
            // If it is, just update the view and layers
            if(mapRef.current) {
                 const bounds = L.latLngBounds([
                    [pickup.lat, pickup.lng],
                    [destination.lat, destination.lng]
                ]);
                mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
            return;
        }

        // Initialize the map
        const map = L.map(mapContainerRef.current).setView([pickup.lat, pickup.lng], 13);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const pickupMarker = L.marker([pickup.lat, pickup.lng]).addTo(map).bindPopup('Pickup');
        const destinationMarker = L.marker([destination.lat, destination.lng]).addTo(map).bindPopup('Destination');
        
        const route = [
            [pickup.lat, pickup.lng],
            [destination.lat, destination.lng]
        ];
        const polyline = L.polyline(route, { color: 'blue' }).addTo(map);

        const bounds = L.latLngBounds(route);
        map.fitBounds(bounds, { padding: [50, 50] });

        // Cleanup function to run when the component unmounts
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };

    }, [pickup, destination]); // Re-run if location changes, but the guard will prevent re-initialization

    return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />;
}
