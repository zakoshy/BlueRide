
"use client";
import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Manually define the icon URLs to ensure they are found by Next.js
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

interface MapProps {
    pickup: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    boatId: string;
}

// Create a single, stable icon instance outside the component
const defaultIcon = new L.Icon({
    iconUrl: iconUrl.src,
    iconRetinaUrl: iconRetinaUrl.src,
    shadowUrl: shadowUrl.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});


export function InteractiveMap({ pickup, destination }: MapProps) {
    const routePositions: [number, number][] = [
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
    ];
    
    // Calculate the center of the bounds
    const bounds = L.latLngBounds(routePositions);
    const center = bounds.getCenter();

    return (
        <MapContainer
            center={center}
            zoom={13}
            bounds={bounds}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false} // Optional: disable zoom on scroll
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[pickup.lat, pickup.lng]} icon={defaultIcon}>
                <Popup>Pickup Point</Popup>
            </Marker>
            <Marker position={[destination.lat, destination.lng]} icon={defaultIcon}>
                <Popup>Destination Point</Popup>
            </Marker>
            <Polyline pathOptions={{ color: 'blue' }} positions={routePositions} />
        </MapContainer>
    );
}

