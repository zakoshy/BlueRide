
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Haversine formula to calculate distance between two lat/lng points in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Pricing constants (could be moved to admin-controlled config)
const RATE_PER_KM = 30; // Ksh per kilometer
const BOAT_TYPE_BASE_RATE = {
    standard: 100,
    luxury: 300,
    speed: 200,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pickupName = searchParams.get('pickup');
    const destinationName = searchParams.get('destination');
    const boatType = searchParams.get('boatType') as keyof typeof BOAT_TYPE_BASE_RATE;

    if (!pickupName || !destinationName || !boatType) {
      return NextResponse.json({ message: 'Missing required parameters: pickup, destination, and boatType' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const locationsCollection = db.collection('locations');

    const pickupLocation = await locationsCollection.findOne({ name: pickupName });
    const destinationLocation = await locationsCollection.findOne({ name: destinationName });

    if (!pickupLocation || !destinationLocation) {
        return NextResponse.json({ message: 'One or both locations not found' }, { status: 404 });
    }

    const distance = getDistance(pickupLocation.lat, pickupLocation.lng, destinationLocation.lat, destinationLocation.lng);
    
    const baseRate = BOAT_TYPE_BASE_RATE[boatType] || BOAT_TYPE_BASE_RATE.standard;
    const distanceCharge = distance * RATE_PER_KM;

    const fare = Math.round(baseRate + distanceCharge);

    return NextResponse.json({ fare, distance }, { status: 200 });

  } catch (error) {
    console.error('Error calculating fare:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
