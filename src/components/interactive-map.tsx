
"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Manually import marker icons for webpack compatibility
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

interface Route {
    pickup: { lat: number; lng: number; };
    destination: { lat: number; lng: number; };
}

interface InteractiveMapProps {
    route: Route | null;
    initialCenter?: { lat: number; lng: number; };
}

const InteractiveMap = ({ route, initialCenter }: InteractiveMapProps) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const boatMarkerRef = useRef<L.Marker | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Default center to Mombasa if no initial center is provided
    const defaultCenter: L.LatLngTuple = [initialCenter?.lat || -4.0435, initialCenter?.lng || 39.6682];
    const defaultZoom = initialCenter ? 14 : 12;

    useEffect(() => {
        // --- Leaflet Icon Fix ---
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: iconRetinaUrl.src,
            iconUrl: iconUrl.src,
            shadowUrl: shadowUrl.src,
        });

        const boatIcon = L.icon({
            iconUrl: '/boat.png',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });

        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                center: defaultCenter,
                zoom: defaultZoom
            });
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
            }).addTo(mapRef.current);
        }

        const map = mapRef.current;
        if (!map) return;

        // Clear previous layers
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });
        if(boatMarkerRef.current) {
             map.removeLayer(boatMarkerRef.current);
             boatMarkerRef.current = null;
        }

        if (route) {
            const pickupLatLng = L.latLng(route.pickup.lat, route.pickup.lng);
            const destinationLatLng = L.latLng(route.destination.lat, route.destination.lng);

            L.marker(pickupLatLng).addTo(map).bindPopup("Pickup");
            L.marker(destinationLatLng).addTo(map).bindPopup("Destination");
            
            map.fitBounds(L.latLngBounds(pickupLatLng, destinationLatLng), { padding: [50, 50] });
            
            const fetchAndDrawRoute = async () => {
                try {
                    const response = await fetch('/api/ors-proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            start: [pickupLatLng.lng, pickupLatLng.lat],
                            end: [destinationLatLng.lng, destinationLatLng.lat],
                        }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                        const routeCoordinates = data.features[0].geometry.coordinates.map((coord: number[]) => L.latLng(coord[1], coord[0]));
                        L.geoJSON(data, { style: { color: "blue", weight: 5, opacity: 0.7 } }).addTo(map);
                        animateBoat(routeCoordinates);
                    } else {
                         // Fallback to a straight line if API fails
                         L.polyline([pickupLatLng, destinationLatLng], { color: 'red', dashArray: '5, 10' }).addTo(map);
                    }
                } catch (error) {
                    console.error("Error fetching route:", error);
                }
            };
            
            fetchAndDrawRoute();

            const animateBoat = (routePath: L.LatLng[]) => {
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                
                if (!boatMarkerRef.current) {
                    boatMarkerRef.current = L.marker(routePath[0], { icon: boatIcon, zIndexOffset: 1000 }).addTo(map);
                } else {
                    boatMarkerRef.current.setLatLng(routePath[0]);
                }
                
                let startTime: number | null = null;
                const duration = 30000; // 30 seconds for animation

                function animationStep(timestamp: number) {
                    if (!startTime) startTime = timestamp;
                    const progress = (timestamp - startTime) / duration;

                    if (progress < 1) {
                        const index = Math.min(Math.floor(progress * routePath.length), routePath.length - 1);
                        if (boatMarkerRef.current) {
                            boatMarkerRef.current.setLatLng(routePath[index]);
                            animationFrameRef.current = requestAnimationFrame(animationStep);
                        }
                    } else {
                         if (boatMarkerRef.current) {
                            boatMarkerRef.current.setLatLng(routePath[routePath.length - 1]);
                         }
                    }
                }
                animationFrameRef.current = requestAnimationFrame(animationStep);
            };
        } else if (initialCenter) {
             map.setView([initialCenter.lat, initialCenter.lng], 14);
        }


        // Cleanup function
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [route, initialCenter, defaultCenter, defaultZoom]);

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
};

export default InteractiveMap;

    