
"use client";
import React, { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapProps {
    apiKey: string;
    pickup: { lat: number; lng: number };
    destination: { lat: number; lng: number };
}

export function InteractiveMap({ apiKey, pickup, destination }: MapProps) {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loader = new Loader({
            apiKey: apiKey,
            version: 'weekly',
            libraries: ['marker', 'routes']
        });

        let map: google.maps.Map | null = null;

        loader.importLibrary('maps').then(async ({Map}) => {
             if (mapRef.current) {
                map = new Map(mapRef.current, {
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
                
                // Destination Marker with custom icon
                const boatIcon = document.createElement('img');
                boatIcon.src = '/boat-icon.svg';
                boatIcon.width = 32;
                boatIcon.height = 32;

                new AdvancedMarkerElement({
                    map,
                    position: destination,
                    title: 'Destination',
                    content: boatIcon,
                });
                
                // Draw a line for the route
                const directionsService = new google.maps.DirectionsService();
                const directionsRenderer = new google.maps.DirectionsRenderer({
                    suppressMarkers: true, // We are using our own markers
                    polylineOptions: {
                        strokeColor: '#6495ED', // Cornflower Blue
                        strokeWeight: 5,
                        strokeOpacity: 0.8,
                    }
                });
                directionsRenderer.setMap(map);

                directionsService.route({
                    origin: pickup,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING, // This is a proxy for water travel distance
                }, (result, status) => {
                    if (status === 'OK' && result) {
                        directionsRenderer.setDirections(result);
                        if(map) {
                            map.fitBounds(result.routes[0].bounds);
                        }
                    } else {
                        console.error(`Directions request failed due to ${status}`);
                    }
                });

             }
        }).catch(e => {
            console.error("Error loading Google Maps", e);
        });

    }, [apiKey, pickup, destination]);

    if (!apiKey) {
        return <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">Please provide a valid Google Maps API Key.</div>;
    }

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};
