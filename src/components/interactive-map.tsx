
"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { database } from '@/lib/firebase/config';
import { ref, onValue } from 'firebase/database';

interface MapProps {
    apiKey: string;
    pickup: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    boatId: string;
}

export function InteractiveMap({ apiKey, pickup, destination, boatId }: MapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const liveBoatMarkerRef = useRef<google.maps.Marker | null>(null);

    useEffect(() => {
        if (!apiKey) {
            console.error("Google Maps API key is missing.");
            return;
        }

        const loader = new Loader({
            apiKey: apiKey,
            version: 'weekly',
            libraries: ['marker', 'routes']
        });

        let map: google.maps.Map | null = null;

        loader.load().then(async () => {
             if (mapRef.current) {
                map = new google.maps.Map(mapRef.current, {
                    center: pickup,
                    zoom: 12,
                    mapId: 'BLUE_RIDE_MAP',
                    mapTypeControl: false,
                    streetViewControl: false,
                });
                
                const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as typeof google.maps;
                
                // Pickup Marker
                new AdvancedMarkerElement({
                    map,
                    position: pickup,
                    title: 'Pickup',
                });
                
                // Destination Marker
                new AdvancedMarkerElement({
                    map,
                    position: destination,
                    title: 'Destination',
                });
                
                // Draw a line for the route
                const directionsService = new google.maps.DirectionsService();
                const directionsRenderer = new google.maps.DirectionsRenderer({
                    suppressMarkers: true, 
                    polylineOptions: {
                        strokeColor: '#6495ED',
                        strokeWeight: 5,
                        strokeOpacity: 0.8,
                    }
                });
                directionsRenderer.setMap(map);

                directionsService.route({
                    origin: pickup,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING, // Proxy for distance
                }, (result, status) => {
                    if (status === 'OK' && result) {
                        directionsRenderer.setDirections(result);
                        if(map) map.fitBounds(result.routes[0].bounds);
                    } else {
                        console.error(`Directions request failed due to ${status}`);
                    }
                });

                // --- Live Boat Marker ---
                const boatIcon = {
                    url: '/boat-icon.svg',
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 20),
                };

                // Use a standard marker for smooth animation
                liveBoatMarkerRef.current = new google.maps.Marker({
                    position: pickup, // Start at pickup
                    map,
                    title: "Live Location",
                    icon: boatIcon,
                    zIndex: 99,
                });
             }
        }).catch(e => {
            console.error("Error loading Google Maps", e);
        });

        // --- Firebase Realtime Listener ---
        const locationRef = ref(database, `boat_locations/${boatId}`);
        const unsubscribe = onValue(locationRef, (snapshot) => {
            const data = snapshot.val();
            if (data && liveBoatMarkerRef.current) {
                const newPosition = { lat: data.lat, lng: data.lng };
                liveBoatMarkerRef.current.setPosition(newPosition);
                // Optionally, pan the map to the new location
                // map?.panTo(newPosition);
            }
        });

        // Cleanup listener on component unmount
        return () => {
            unsubscribe();
        };

    }, [apiKey, pickup, destination, boatId]);

    if (!apiKey) {
        return <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">Please provide a valid Google Maps API Key.</div>;
    }

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};
