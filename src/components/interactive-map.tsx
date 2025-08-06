
"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Manually import marker icons for webpack compatibility
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

interface WeatherData {
    condition: string;
    temp: number;
    wind: number;
    icon: string;
}

const InteractiveMap = () => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const boatMarkerRef = useRef<L.Marker | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        // --- Leaflet Icon Fix ---
        // This is a common fix for Leaflet + Webpack issues
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: iconRetinaUrl.src,
            iconUrl: iconUrl.src,
            shadowUrl: shadowUrl.src,
        });

        if (!mapContainerRef.current || mapRef.current) return; // Initialize map only once

        const map = L.map(mapContainerRef.current!).setView([-4.0435, 39.6682], 13); // Centered on Mombasa
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
        }).addTo(map);

        let startMarker: L.Marker | null = null;
        let endMarker: L.Marker | null = null;
        let routeLayer: L.GeoJSON | null = null;
        let currentLocation: L.LatLng | null = null;
        
        const boatIcon = L.icon({
            iconUrl: '/boat.png',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });


        const fetchWeather = async (lat: number, lon: number) => {
             try {
                const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
                const data = await response.json();
                if (response.ok) {
                    setWeather({
                        condition: data.condition,
                        temp: data.temp,
                        wind: data.wind,
                        icon: `https://openweathermap.org/img/wn/${data.icon}@2x.png`
                    });
                } else {
                    console.error('Failed to fetch weather:', data.message);
                }
            } catch (error) {
                console.error("Error fetching weather:", error);
            }
        };

        const drawRoute = async (start: L.LatLng, end: L.LatLng) => {
            try {
                const response = await fetch('/api/ors-proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        start: [start.lng, start.lat],
                        end: [end.lng, end.lat],
                    }),
                });

                const data = await response.json();
                if (response.ok) {
                    if (routeLayer) map.removeLayer(routeLayer);
                    routeLayer = L.geoJSON(data, { style: { color: "blue", weight: 5, opacity: 0.7 } }).addTo(map);
                    
                    const routeCoordinates = data.features[0].geometry.coordinates.map((coord: number[]) => L.latLng(coord[1], coord[0]));
                    animateBoat(routeCoordinates);

                } else {
                    alert(`Error fetching route: ${data.message}`);
                }
            } catch (error) {
                console.error("Error fetching route:", error);
                alert("An unexpected error occurred while fetching the route.");
            }
        };

        const animateBoat = (route: L.LatLng[]) => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            
            if (!boatMarkerRef.current) {
                boatMarkerRef.current = L.marker(route[0], { icon: boatIcon, zIndexOffset: 1000 }).addTo(map);
            } else {
                boatMarkerRef.current.setLatLng(route[0]);
            }
            
            let startTime: number | null = null;
            const duration = 30000; // 30 seconds for animation

            function animationStep(timestamp: number) {
                if (!startTime) startTime = timestamp;
                const progress = (timestamp - startTime) / duration;

                if (progress < 1) {
                    const index = Math.min(Math.floor(progress * route.length), route.length - 1);
                    boatMarkerRef.current!.setLatLng(route[index]);
                    animationFrameRef.current = requestAnimationFrame(animationStep);
                } else {
                    boatMarkerRef.current!.setLatLng(route[route.length - 1]);
                }
            }
            animationFrameRef.current = requestAnimationFrame(animationStep);
        };
        
        map.on('click', (e: L.LeafletMouseEvent) => {
            if (!currentLocation) {
                alert("Cannot set destination: Current location not available.");
                return;
            }

            if (endMarker) map.removeLayer(endMarker);
            endMarker = L.marker(e.latlng).addTo(map).bindPopup("Destination");
            drawRoute(currentLocation, e.latlng);
        });

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation = L.latLng(position.coords.latitude, position.coords.longitude);
                    
                    if (startMarker) map.removeLayer(startMarker);
                    startMarker = L.marker(currentLocation).addTo(map).bindPopup("You are here").openPopup();
                    
                    map.setView(currentLocation, 14);
                    
                    fetchWeather(currentLocation.lat, currentLocation.lng);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    alert("Location access denied or unavailable. Defaulting to Mombasa.");
                    currentLocation = L.latLng(-4.0435, 39.6682); // Fallback to Mombasa
                    fetchWeather(currentLocation.lat, currentLocation.lng);
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
            {weather && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '10px',
                    borderRadius: '5px',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <img src={weather.icon} alt={weather.condition} style={{ width: '50px', height: '50px' }} />
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{weather.condition}</div>
                        <div>Temp: {weather.temp.toFixed(1)}°C</div>
                        <div>Wind: {weather.wind.toFixed(1)} m/s</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InteractiveMap;
