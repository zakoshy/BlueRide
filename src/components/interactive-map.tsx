
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
    const mapInstance = useRef<L.Map | null>(null);

    useEffect(() => {
        if (mapRef.current) {
            
            // This is the fix: we are manually setting the icon paths for Leaflet's default icon.
            // This needs to be done before any markers are created.
            // @ts-ignore
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: iconRetinaUrl.src,
                iconUrl: iconUrl.src,
                shadowUrl: shadowUrl.src,
            });

            // Check if map is already initialized on this container
            if (mapRef.current.hasChildNodes()) { // A simple check to see if Leaflet has already attached the map
                // If you need to update the map, do it here.
                // For now, we assume it doesn't need updates after initialization.
                return;
            }

            // Calculate center and bounds
            const bounds = L.latLngBounds([
                [pickup.lat, pickup.lng],
                [destination.lat, destination.lng]
            ]);
            const center = bounds.getCenter();
            
            // Initialize the map
            const map = L.map(mapRef.current).setView(center, 13);
            mapInstance.current = map;

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Add markers. They will now use the corrected default icon.
            L.marker([pickup.lat, pickup.lng]).addTo(map).bindPopup('Pickup');
            L.marker([destination.lat, destination.lng]).addTo(map).bindPopup('Destination');
            
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
