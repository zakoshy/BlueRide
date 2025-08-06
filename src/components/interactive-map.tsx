
"use client";
import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Explicitly import marker icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';


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
        
        // Define a custom icon to avoid global conflicts
        const boatIcon = L.icon({
            iconRetinaUrl: iconRetinaUrl.src,
            iconUrl: iconUrl.src,
            shadowUrl: shadowUrl.src,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // Check if map is already initialized to prevent re-initialization
        if (mapContainerRef.current && !(mapContainerRef.current as any)._leaflet_id) {
            const map = L.map(mapContainerRef.current).setView([pickup.lat, pickup.lng], 13);
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Use the custom icon for markers
            const pickupMarker = L.marker([pickup.lat, pickup.lng], { icon: boatIcon }).addTo(map).bindPopup('Pickup');
            const destinationMarker = L.marker([destination.lat, destination.lng], { icon: boatIcon }).addTo(map).bindPopup('Destination');
            
            const route = [
                [pickup.lat, pickup.lng],
                [destination.lat, destination.lng]
            ];
            const polyline = L.polyline(route, { color: 'blue' }).addTo(map);

            const bounds = L.latLngBounds(route);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (mapRef.current) {
            // If map exists, just update its view and layers
            const bounds = L.latLngBounds([
                [pickup.lat, pickup.lng],
                [destination.lat, destination.lng]
            ]);
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });

            // Example of updating layers if needed (can be expanded)
            // For now, we assume markers don't need to be cleared/re-added on every prop change,
            // but if they do, that logic would go here.
        }

        // Cleanup function to run when the component unmounts
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };

    }, [pickup, destination]); // Re-run if location changes

    return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />;
}
