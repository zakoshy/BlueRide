
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const routesData = {
  "routes": [
    // Mombasa County (2 docking points)
    { "from": "Likoni Ferry Terminal", "to": "Marina English Point", "fare_per_person_kes": 70 },
    { "from": "Marina English Point", "to": "Likoni Ferry Terminal", "fare_per_person_kes": 70 },

    // Mombasa County inter-county routes from both docks
    { "from": "Likoni Ferry Terminal", "to": "Kilifi Jetty", "fare_per_person_kes": 1000 },
    { "from": "Kilifi Jetty", "to": "Likoni Ferry Terminal", "fare_per_person_kes": 1000 },

    { "from": "Marina English Point", "to": "Kilifi Jetty", "fare_per_person_kes": 950 },
    { "from": "Kilifi Jetty", "to": "Marina English Point", "fare_per_person_kes": 950 },

    { "from": "Likoni Ferry Terminal", "to": "Shimoni Jetty", "fare_per_person_kes": 350 },
    { "from": "Shimoni Jetty", "to": "Likoni Ferry Terminal", "fare_per_person_kes": 350 },

    { "from": "Marina English Point", "to": "Shimoni Jetty", "fare_per_person_kes": 380 },
    { "from": "Shimoni Jetty", "to": "Marina English Point", "fare_per_person_kes": 380 },

    { "from": "Likoni Ferry Terminal", "to": "Lamu Port", "fare_per_person_kes": 3000 },
    { "from": "Lamu Port", "to": "Likoni Ferry Terminal", "fare_per_person_kes": 3000 },

    { "from": "Marina English Point", "to": "Lamu Port", "fare_per_person_kes": 2900 },
    { "from": "Lamu Port", "to": "Marina English Point", "fare_per_person_kes": 2900 },

    // Kilifi County (3 docking points)
    { "from": "Kilifi Jetty", "to": "Bofa Jetty", "fare_per_person_kes": 150 },
    { "from": "Bofa Jetty", "to": "Kilifi Jetty", "fare_per_person_kes": 150 },

    { "from": "Kilifi Jetty", "to": "Malindi Jetty", "fare_per_person_kes": 800 },
    { "from": "Malindi Jetty", "to": "Kilifi Jetty", "fare_per_person_kes": 800 },

    { "from": "Bofa Jetty", "to": "Malindi Jetty", "fare_per_person_kes": 850 },
    { "from": "Malindi Jetty", "to": "Bofa Jetty", "fare_per_person_kes": 850 },

    // Kilifi inter-county routes
    { "from": "Kilifi Jetty", "to": "Shimoni Jetty", "fare_per_person_kes": 1300 },
    { "from": "Shimoni Jetty", "to": "Kilifi Jetty", "fare_per_person_kes": 1300 },

    { "from": "Bofa Jetty", "to": "Shimoni Jetty", "fare_per_person_kes": 1250 },
    { "from": "Shimoni Jetty", "to": "Bofa Jetty", "fare_per_person_kes": 1250 },

    { "from": "Malindi Jetty", "to": "Shimoni Jetty", "fare_per_person_kes": 1350 },
    { "from": "Shimoni Jetty", "to": "Malindi Jetty", "fare_per_person_kes": 1350 },

    { "from": "Kilifi Jetty", "to": "Lamu Port", "fare_per_person_kes": 2000 },
    { "from": "Lamu Port", "to": "Kilifi Jetty", "fare_per_person_kes": 2000 },

    { "from": "Bofa Jetty", "to": "Lamu Port", "fare_per_person_kes": 2050 },
    { "from": "Lamu Port", "to": "Bofa Jetty", "fare_per_person_kes": 2050 },

    { "from": "Malindi Jetty", "to": "Lamu Port", "fare_per_person_kes": 2100 },
    { "from": "Lamu Port", "to": "Malindi Jetty", "fare_per_person_kes": 2100 },

    // Kwale County (5 docking points)
    { "from": "Shimoni Jetty", "to": "Vanga Port", "fare_per_person_kes": 500 },
    { "from": "Vanga Port", "to": "Shimoni Jetty", "fare_per_person_kes": 500 },

    { "from": "Shimoni Jetty", "to": "Wasini Island Jetty", "fare_per_person_kes": 100 },
    { "from": "Wasini Island Jetty", "to": "Shimoni Jetty", "fare_per_person_kes": 100 },

    { "from": "Wasini Island Jetty", "to": "Gasi Dock", "fare_per_person_kes": 250 },
    { "from": "Gasi Dock", "to": "Wasini Island Jetty", "fare_per_person_kes": 250 },

    { "from": "Shimoni Jetty", "to": "Funzi Island Dock", "fare_per_person_kes": 300 },
    { "from": "Funzi Island Dock", "to": "Shimoni Jetty", "fare_per_person_kes": 300 },

    { "from": "Vanga Port", "to": "Funzi Island Dock", "fare_per_person_kes": 550 },
    { "from": "Funzi Island Dock", "to": "Vanga Port", "fare_per_person_kes": 550 },

    { "from": "Vanga Port", "to": "Gasi Dock", "fare_per_person_kes": 400 },
    { "from": "Gasi Dock", "to": "Vanga Port", "fare_per_person_kes": 400 },

    { "from": "Funzi Island Dock", "to": "Gasi Dock", "fare_per_person_kes": 350 },
    { "from": "Gasi Dock", "to": "Funzi Island Dock", "fare_per_person_kes": 350 },

    // Kwale inter-county routes
    { "from": "Shimoni Jetty", "to": "Likoni Ferry Terminal", "fare_per_person_kes": 350 },
    { "from": "Likoni Ferry Terminal", "to": "Shimoni Jetty", "fare_per_person_kes": 350 },

    { "from": "Vanga Port", "to": "Kilifi Jetty", "fare_per_person_kes": 1400 },
    { "from": "Kilifi Jetty", "to": "Vanga Port", "fare_per_person_kes": 1400 },

    { "from": "Gasi Dock", "to": "Malindi Jetty", "fare_per_person_kes": 1550 },
    { "from": "Malindi Jetty", "to": "Gasi Dock", "fare_per_person_kes": 1550 },

    { "from": "Funzi Island Dock", "to": "Malindi Jetty", "fare_per_person_kes": 1600 },
    { "from": "Malindi Jetty", "to": "Funzi Island Dock", "fare_per_person_kes": 1600 },

    { "from": "Wasini Island Jetty", "to": "Malindi Jetty", "fare_per_person_kes": 1500 },
    { "from": "Malindi Jetty", "to": "Wasini Island Jetty", "fare_per_person_kes": 1500 },

    { "from": "Vanga Port", "to": "Lamu Port", "fare_per_person_kes": 2300 },
    { "from": "Lamu Port", "to": "Vanga Port", "fare_per_person_kes": 2300 },

    // Lamu County (5 docking points)
    { "from": "Lamu Port", "to": "Kiunga Jetty", "fare_per_person_kes": 400 },
    { "from": "Kiunga Jetty", "to": "Lamu Port", "fare_per_person_kes": 400 },

    { "from": "Lamu Port", "to": "Manda Port", "fare_per_person_kes": 350 },
    { "from": "Manda Port", "to": "Lamu Port", "fare_per_person_kes": 350 },
    
    { "from": "Lamu Port", "to": "Pate Island Jetty", "fare_per_person_kes": 300 },
    { "from": "Pate Island Jetty", "to": "Lamu Port", "fare_per_person_kes": 300 },

    { "from": "Kiunga Jetty", "to": "Manda Port", "fare_per_person_kes": 450 },
    { "from": "Manda Port", "to": "Kiunga Jetty", "fare_per_person_kes": 450 },

    { "from": "Kiunga Jetty", "to": "Pate Island Jetty", "fare_per_person_kes": 400 },
    { "from": "Pate Island Jetty", "to": "Kiunga Jetty", "fare_per_person_kes": 400 },

    { "from": "Manda Port", "to": "Pate Island Jetty", "fare_per_person_kes": 250 },
    { "from": "Pate Island Jetty", "to": "Manda Port", "fare_per_person_kes": 250 },

    // Inter-county routes from Lamu
    { "from": "Lamu Port", "to": "Likoni Ferry Terminal", "fare_per_person_kes": 3000 },
    { "from": "Likoni Ferry Terminal", "to": "Lamu Port", "fare_per_person_kes": 3000 },

    { "from": "Lamu Port", "to": "Kilifi Jetty", "fare_per_person_kes": 2000 },
    { "from": "Kilifi Jetty", "to": "Lamu Port", "fare_per_person_kes": 2000 },

    { "from": "Lamu Port", "to": "Shimoni Jetty", "fare_per_person_kes": 2800 },
    { "from": "Shimoni Jetty", "to": "Lamu Port", "fare_per_person_kes": 2800 }
  ]
};

const locationCoordinates: Record<string, { lat: number, lng: number, county: string, area: string }> = {
    "Likoni Ferry Terminal": { lat: -4.070, lng: 39.660, county: "Mombasa", area: "Likoni" },
    "Marina English Point": { lat: -4.055, lng: 39.678, county: "Mombasa", area: "Nyali" },
    "Kilifi Jetty": { lat: -3.630, lng: 39.850, county: "Kilifi", area: "Kilifi Town" },
    "Bofa Jetty": { lat: -3.590, lng: 39.880, county: "Kilifi", area: "Bofa" },
    "Malindi Jetty": { lat: -3.220, lng: 40.120, county: "Kilifi", area: "Malindi Town" },
    "Shimoni Jetty": { lat: -4.650, lng: 39.380, county: "Kwale", area: "Shimoni" },
    "Vanga Port": { lat: -4.670, lng: 39.220, county: "Kwale", area: "Vanga" },
    "Wasini Island Jetty": { lat: -4.665, lng: 39.365, county: "Kwale", area: "Wasini Island" },
    "Gasi Dock": { lat: -4.430, lng: 39.580, county: "Kwale", area: "Gasi" },
    "Funzi Island Dock": { lat: -4.580, lng: 39.450, county: "Kwale", area: "Funzi Island" },
    "Lamu Port": { lat: -2.270, lng: 40.900, county: "Lamu", area: "Lamu Town" },
    "Kiunga Jetty": { lat: -1.740, lng: 41.450, county: "Lamu", area: "Kiunga" },
    "Manda Port": { lat: -2.260, lng: 40.920, county: "Lamu", area: "Manda Island" },
    "Pate Island Jetty": { lat: -2.130, lng: 41.090, county: "Lamu", area: "Pate Island" }
};


async function seedNewData() {
    const client = await clientPromise;
    const db = client.db();
    const routesCollection = db.collection('routes');
    const locationsCollection = db.collection('locations');

    // Clear existing data
    await routesCollection.deleteMany({});
    await locationsCollection.deleteMany({});
    console.log("Cleared existing routes and locations.");

    // Seed new routes
    await routesCollection.insertMany(routesData.routes);
    console.log(`Seeded ${routesData.routes.length} new routes.`);

    // Seed new locations from unique names in routes
    const uniqueLocationNames = [...new Set(routesData.routes.flatMap(r => [r.from, r.to]))];
    const locationDocs = uniqueLocationNames.map(name => ({
        name,
        ...locationCoordinates[name] // Add coordinates if they exist
    }));
    
    await locationsCollection.insertMany(locationDocs);
    console.log(`Seeded ${locationDocs.length} new locations.`);
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');

    // Run seeder on first load or when explicitly told to
    if (process.env.NODE_ENV === 'development') {
       await seedNewData();
    }
    
    const client = await clientPromise;
    const db = client.db();
    const routesCollection = db.collection('routes');

    if (from) {
        // Return destinations for a given pickup point
        const destinations = await routesCollection.find({ from }).project({ to: 1, _id: 0 }).toArray();
        return NextResponse.json(destinations.map(d => d.to), { status: 200 });
    } else {
        // Return all unique pickup points
        const pickupPoints = await routesCollection.distinct('from');
        return NextResponse.json(pickupPoints, { status: 200 });
    }

  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
