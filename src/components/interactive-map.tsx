
"use client";
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import marker icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

interface MapProps {
    pickup: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    boatId: string;
}

export function InteractiveMap({ pickup, destination }: MapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null); // Ref to store map instance

    useEffect(() => {
        // Ensure this code runs only on the client
        if (typeof window !== 'undefined' && mapRef.current) {
            
            // Check if map is already initialized on this container
            if (mapInstance.current) {
                return;
            }

            // Create a stable, custom icon
            const defaultIcon = L.icon({
                iconUrl: iconUrl.src,
                iconRetinaUrl: iconRetinaUrl.src,
                shadowUrl: shadowUrl.src,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            // Calculate center and bounds
            const bounds = L.latLngBounds([
                [pickup.lat, pickup.lng],
                [destination.lat, destination.lng]
            ]);
            const center = bounds.getCenter();
            
            // Initialize the map
            const map = L.map(mapRef.current).setView(center, 13);
            mapInstance.current = map; // Store instance

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Add markers with the custom icon
            L.marker([pickup.lat, pickup.lng], { icon: defaultIcon }).addTo(map).bindPopup('Pickup');
            L.marker([destination.lat, destination.lng], { icon: defaultIcon }).addTo(map).bindPopup('Destination');
            
            // Fit map to bounds
            map.fitBounds(bounds, { padding: [50, 50] });

            // Cleanup function to remove the map on component unmount
            return () => {
                if (mapInstance.current) {
                    mapInstance.current.remove();
                    mapInstance.current = null;
                }
            };
        }
    }, [pickup, destination]); // Re-run effect if coordinates change

    return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}

    