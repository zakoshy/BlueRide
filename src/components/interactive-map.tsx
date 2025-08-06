
"use client";
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import marker icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

export function InteractiveMap() {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        // This is a common fix for Leaflet + Webpack issues
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: iconRetinaUrl.src,
            iconUrl: iconUrl.src,
            shadowUrl: shadowUrl.src,
        });
        
        const mapContainer = mapRef.current;
        // Prevent map from initializing more than once
        if (mapContainer && mapContainer.hasChildNodes()) {
            return;
        }

        const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImRmZjk2MTYxNzNjNTQ0YzY4NmYwNTI1OTg1OTE4NDEwIiwiaCI6Im11cm11cjY0In0=";
        const destination = [39.6800, -4.0500]; // Example: Destination in Mombasa

        const map = L.map(mapContainer).setView([-4.0435, 39.6682], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
        }).addTo(map);

        function drawRoute(start: number[], end: number[]) {
            fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
                method: "POST",
                headers: {
                    Authorization: API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    coordinates: [start, end],
                }),
            })
            .then((res) => res.json())
            .then((data) => {
                if(data.features) {
                    L.geoJSON(data, {
                        style: { color: "blue", weight: 4 },
                    }).addTo(map);
                }
            })
            .catch((err) => console.error("Error fetching route:", err));
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const currentLocation = [
                        position.coords.longitude,
                        position.coords.latitude,
                    ];

                    L.marker([currentLocation[1], currentLocation[0]])
                        .addTo(map)
                        .bindPopup("You are here")
                        .openPopup();

                    L.marker([destination[1], destination[0]])
                        .addTo(map)
                        .bindPopup("Destination");

                    map.setView([currentLocation[1], currentLocation[0]], 13);

                    drawRoute(currentLocation, destination);
                },
                (error) => {
                    alert("Location access denied or unavailable.");
                }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
        
         return () => {
            map.remove();
        };

    }, []);

    return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}
