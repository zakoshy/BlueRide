
"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Manually import marker icons for webpack compatibility
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import boatIconUrl from 'public/boat.png';
import { useToast } from '@/hooks/use-toast';

interface InteractiveMapProps {
    route: { 
        pickup: { lat: number; lng: number };
        destination: { lat: number; lng: number };
    } | null;
}

const InteractiveMap = ({ route }: InteractiveMapProps) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const boatMarkerRef = useRef<L.Marker | null>(null);
    const routeLineRef = useRef<L.Polyline | null>(null);
    const startMarkerRef = useRef<L.Marker | null>(null);
    const endMarkerRef = useRef<L.Marker | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const { toast } = useToast();

    // Default center to Mombasa if no initial center is provided
    const defaultCenter: L.LatLngTuple = [-4.0435, 39.6682];

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
            iconUrl: boatIconUrl.src,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });
        
        const mapContainer = mapContainerRef.current;
        if (mapContainer && !mapRef.current) {
             if ((mapContainer as any)._leaflet_id) {
                return;
            }
            mapRef.current = L.map(mapContainer, {
                center: defaultCenter,
                zoom: 13
            });
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
            }).addTo(mapRef.current);
        }
        
        const map = mapRef.current;
        if (!map) return;
        
        const clearMap = () => {
            if (boatMarkerRef.current) map.removeLayer(boatMarkerRef.current);
            if (routeLineRef.current) map.removeLayer(routeLineRef.current);
            if (startMarkerRef.current) map.removeLayer(startMarkerRef.current);
            if (endMarkerRef.current) map.removeLayer(endMarkerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

            boatMarkerRef.current = null;
            routeLineRef.current = null;
            startMarkerRef.current = null;
            endMarkerRef.current = null;
        }

        const animateBoat = (routePath: L.LatLng[]) => {
            clearMap(); // Clear previous animations and routes
            
            // Re-add markers
            startMarkerRef.current = L.marker(routePath[0]).addTo(map).bindPopup("Pickup");
            endMarkerRef.current = L.marker(routePath[routePath.length -1]).addTo(map).bindPopup("Destination");
            
             // Re-add route line
            routeLineRef.current = L.geoJSON({ type: "LineString", coordinates: routePath.map(latLng => [latLng.lng, latLng.lat]) }, { style: { color: "blue", weight: 5, opacity: 0.7 } }).addTo(map);

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

        if (route?.pickup && route?.destination) {
            const pickupLocation: L.LatLngTuple = [route.pickup.lat, route.pickup.lng];
            const destinationLocation: L.LatLngTuple = [route.destination.lat, route.destination.lng];
            
            map.fitBounds([pickupLocation, destinationLocation], { padding: [50, 50] });

            const fetchRoute = async () => {
                try {
                    const response = await fetch('/api/ors-proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            start: [pickupLocation[1], pickupLocation[0]],
                            end: [destinationLocation[1], destinationLocation[0]],
                        }),
                    });
                    const data = await response.json();
                    if (response.ok && data.features && data.features.length > 0) {
                        const routeCoordinates = data.features[0].geometry.coordinates.map((coord: number[]) => L.latLng(coord[1], coord[0]));
                        animateBoat(routeCoordinates);
                    } else {
                         // Fallback to a straight line if API fails
                         toast({ title: "Routing Error", description: "Could not fetch optimal route. Displaying direct path.", variant: "destructive" });
                         clearMap();
                         startMarkerRef.current = L.marker(pickupLocation).addTo(map).bindPopup("Pickup");
                         endMarkerRef.current = L.marker(destinationLocation).addTo(map).bindPopup("Destination");
                         routeLineRef.current = L.polyline([pickupLocation, destinationLocation], { color: 'red', dashArray: '5, 10' }).addTo(map);
                    }
                } catch (error) {
                     console.error("Error fetching route:", error);
                     toast({ title: "Routing Error", description: "An unexpected error occurred while fetching the route.", variant: "destructive" });
                }
            };
            fetchRoute();
        } else {
            clearMap();
            map.setView(defaultCenter, 13);
        }

        // Cleanup function
        return () => {
             if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [route, toast]);

    return (
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    );
};

export default InteractiveMap;
