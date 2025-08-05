
import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase/config';
import { ref, set, serverTimestamp } from 'firebase/database';

// In a real app, you would protect this route and validate that the request
// comes from the authenticated captain assigned to the boat.

export async function POST(request: Request) {
    try {
        const { boatId, lat, lng } = await request.json();

        if (!boatId || lat === undefined || lng === undefined) {
            return NextResponse.json({ message: 'Missing required fields: boatId, lat, and lng' }, { status: 400 });
        }

        const locationRef = ref(database, `boat_locations/${boatId}`);

        await set(locationRef, {
            lat: lat,
            lng: lng,
            timestamp: serverTimestamp()
        });

        return NextResponse.json({ message: 'Location updated successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error updating location:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
