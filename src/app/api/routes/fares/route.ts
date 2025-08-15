
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This API endpoint fetches all routes with their fares.
// In a real app, you might protect this if the fare info is sensitive.

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const routesCollection = db.collection('routes');

    const routes = await routesCollection.find({}).sort({ from: 1, to: 1 }).toArray();

    return NextResponse.json(routes, { status: 200 });
  } catch (error) {
    console.error('Error fetching routes with fares:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

    