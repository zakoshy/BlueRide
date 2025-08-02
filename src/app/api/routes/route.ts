
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
            { "name": "Lamu Town Jetty", "county": "Lamu", "area": "Lamu Island" },
            { "name": "Shela Jetty", "county": "Lamu", "area": "Lamu Island" },
            { "name": "Manda Airport Jetty", "county": "Lamu", "area": "Manda Island" },
            { "name": "Matondoni Dock", "county": "Lamu", "area": "Lamu Island" },
            { "name": "Kipungani Dock", "county": "Lamu", "area": "Lamu Island" },
            { "name": "Faza Jetty", "county": "Lamu", "area": "Pate Island" },
            { "name": "Siyu Jetty", "county": "Lamu", "area": "Pate Island" },
            { "name": "Kiwayu Landing Site", "county": "Lamu", "area": "Kiwayu Island" },
            { "name": "Ndau Jetty", "county": "Lamu", "area": "Ndau" },
            { "name": "Kizingitini Jetty", "county": "Lamu", "area": "Pate Island" },
            { "name": "Mokowe Jetty", "county": "Lamu", "area": "Mainland" },
            { "name": "Kilifi Ferry Dock", "county": "Kilifi", "area": "Kilifi Town" },
            { "name": "Mnarani Dock", "county": "Kilifi", "area": "Mnarani" },
            { "name": "Bofa Beach Landing", "county": "Kilifi", "area": "Kilifi North" },
            { "name": "Watamu Dock", "county": "Kilifi", "area": "Watamu" },
            { "name": "Mida Creek Jetty", "county": "Kilifi", "area": "Near Watamu" },
            { "name": "Malindi Jetty", "county": "Kilifi", "area": "Malindi Town" },
            { "name": "Mayungu Beach Dock", "county": "Kilifi", "area": "Between Malindi and Watamu" },
            { "name": "Mombasa Old Port Jetty", "county": "Mombasa", "area": "Mombasa Island" },
            { "name": "Fort Jesus Waterfront", "county": "Mombasa", "area": "Mombasa Island" },
            { "name": "Likoni Dock", "county": "Mombasa", "area": "Mainland" },
            { "name": "Tudor Creek Jetty", "county": "Mombasa", "area": "Tudor" },
            { "name": "Nyali Bridge Dock", "county": "Mombasa", "area": "Nyali" },
            { "name": "English Point Marina", "county": "Mombasa", "area": "Nyali/Mombasa Island" },
            { "name": "Mtwapa Creek Jetty", "county": "Mombasa", "area": "North Coast" },
            { "name": "Kipini Jetty", "county": "Tana River", "area": "Kipini Town" },
            { "name": "Wema Jetty", "county": "Tana River", "area": "Tana Delta" },
            { "name": "Ozi Jetty", "county": "Tana River", "area": "Coastal Wetlands" },
            { "name": "Moa Landing Site", "county": "Tana River", "area": "Near Kiunga" },
            { "name": "Kiunga Jetty", "county": "Tana River", "area": "Border Region" }
        ]);
        console.log("Seeded locations");
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
