
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

// --- Uber-Style Pricing Constants ---
// In a real app, these would be stored in an admin-controlled config in the DB
const RATE_PER_KM = 50; // Ksh per kilometer
const RATE_PER_MINUTE = 10; // Ksh per minute
const DEMAND_MULTIPLIER = 1.0; // Default, can be changed based on time/demand
const AVERAGE_BOAT_SPEED_KPH = 15; // Average speed for a water taxi

const BOAT_TYPE_BASE_FARE = {
    standard: 100,
    luxury: 300,
    speed: 250,
};
// ---

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pickupName = searchParams.get('pickup');
    const destinationName = searchParams.get('destination');
    const boatType = searchParams.get('boatType') as keyof typeof BOAT_TYPE_BASE_FARE;

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

    // --- Fare Calculation ---
    const distanceKm = getDistance(pickupLocation.lat, pickupLocation.lng, destinationLocation.lat, destinationLocation.lng);
    
    // Estimate duration in minutes
    const estimatedDurationHours = distanceKm / AVERAGE_BOAT_SPEED_KPH;
    const estimatedDurationMinutes = estimatedDurationHours * 60;
    
    const baseFare = BOAT_TYPE_BASE_FARE[boatType] || BOAT_TYPE_BASE_FARE.standard;
    const distanceCharge = distanceKm * RATE_PER_KM;
    const durationCharge = estimatedDurationMinutes * RATE_PER_MINUTE;

    const totalCalculatedFare = baseFare + distanceCharge + durationCharge;
    const finalFare = Math.round(totalCalculatedFare * DEMAND_MULTIPLIER);
    // ---

    return NextResponse.json({ 
        fare: finalFare, 
        distance: distanceKm, 
        duration: estimatedDurationMinutes 
    }, { status: 200 });

  } catch (error) {
    console.error('Error calculating fare:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
