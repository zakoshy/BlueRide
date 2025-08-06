
"use client";
import React, { useEffect, useMemo } from 'react';
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

// Custom component to set map view without re-rendering MapContainer
const ChangeView = ({ center, zoom }: { center: L.LatLngExpression, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [map, center, zoom]);
    return null;
}

export function InteractiveMap({ pickup, destination }: MapProps) {
    const center = useMemo(() => [pickup.lat, pickup.lng] as L.LatLngExpression, [pickup.lat, pickup.lng]);
    const route: L.LatLngExpression[] = useMemo(() => [
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
    ], [pickup.lat, pickup.lng, destination.lat, destination.lng]);

    if (!pickup || !destination) {
        return <div className="w-full h-full bg-muted animate-pulse"></div>;
    }

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <ChangeView center={center} zoom={12} />
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[pickup.lat, pickup.lng]} title="Pickup"></Marker>
            <Marker position={[destination.lat, destination.lng]} title="Destination"></Marker>
            <Polyline positions={route} color="blue" />
        </MapContainer>
    );
}
