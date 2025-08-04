
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// For simplicity, we'll manage routes/locations here. In a real app, this could be an admin feature.
async function seedLocations() {
    const client = await clientPromise;
    const db = client.db();
    const locationsCollection = db.collection('locations');

    const existingLocations = await locationsCollection.countDocuments();
    if (existingLocations === 0) {
        await locationsCollection.insertMany([
            // Lamu County
            { "name": "Lamu Town Jetty", "county": "Lamu", "area": "Lamu Island", "lat": -2.2694, "lng": 40.9021 },
            { "name": "Shela Jetty", "county": "Lamu", "area": "Lamu Island", "lat": -2.296, "lng": 40.915 },
            { "name": "Manda Airport Jetty", "county": "Lamu", "area": "Manda Island", "lat": -2.253, "lng": 40.913 },
            { "name": "Matondoni Dock", "county": "Lamu", "area": "Lamu Island", "lat": -2.28, "lng": 40.86 },
            { "name": "Kipungani Dock", "county": "Lamu", "area": "Lamu Island", "lat": -2.316, "lng": 40.862 },
            { "name": "Faza Jetty", "county": "Lamu", "area": "Pate Island", "lat": -2.05, "lng": 41.1 },
            { "name": "Mokowe Jetty", "county": "Lamu", "area": "Mainland", "lat": -2.22, "lng": 40.89 },
            // Kilifi County
            { "name": "Kilifi Ferry Dock", "county": "Kilifi", "area": "Kilifi Town", "lat": -3.63, "lng": 39.85 },
            { "name": "Watamu Dock", "county": "Kilifi", "area": "Watamu", "lat": -3.35, "lng": 40.01 },
            { "name": "Malindi Jetty", "county": "Kilifi", "area": "Malindi Town", "lat": -3.22, "lng": 40.12 },
            // Mombasa County
            { "name": "Mombasa Old Port Jetty", "county": "Mombasa", "area": "Mombasa Island", "lat": -4.06, "lng": 39.67 },
            { "name": "English Point Marina", "county": "Mombasa", "area": "Nyali", "lat": -4.055, "lng": 39.678 },
            { "name": "Likoni Dock", "county": "Mombasa", "area": "Mainland", "lat": -4.07, "lng": 39.66 }
        ]);
        console.log("Seeded locations with coordinates");
    }
}


export async function GET() {
  try {
    await seedLocations(); // Ensure we have some default locations
    const client = await clientPromise;
    const db = client.db();
    const locationsCollection = db.collection('locations');

    const locations = await locationsCollection.find({}).toArray();

    return NextResponse.json(locations, { status: 200 });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
