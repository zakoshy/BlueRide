
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// For simplicity, we'll manage routes here. In a real app, this could be an admin feature.
async function seedRoutes() {
    const client = await clientPromise;
    const db = client.db();
    const routesCollection = db.collection('routes');

    const existingRoutes = await routesCollection.countDocuments();
    if (existingRoutes === 0) {
        await routesCollection.insertMany([
            { name: "Mbita to Mfangano Island", pickup: "Mbita Ferry Terminal", destination: "Mfangano Island" },
            { name: "Mbita to Takawiri Island", pickup: "Mbita Ferry Terminal", destination: "Takawiri Island" },
            { name: "Mfangano Island to Mbita", pickup: "Mfangano Island", destination: "Mbita Ferry Terminal" },
            { name: "Takawiri Island to Mbita", pickup: "Takawiri Island", destination: "Mbita Ferry Terminal" },
            { name: "Rusinga Island to Mbita", pickup: "Rusinga Island Lodge", destination: "Mbita Ferry Terminal" },
        ]);
        console.log("Seeded routes");
    }
}


export async function GET() {
  try {
    await seedRoutes(); // Ensure we have some default routes
    const client = await clientPromise;
    const db = client.db();
    const routesCollection = db.collection('routes');

    const routes = await routesCollection.find({}).toArray();

    return NextResponse.json(routes, { status: 200 });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
