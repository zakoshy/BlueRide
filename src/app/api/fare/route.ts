
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pickup = searchParams.get('pickup');
    const destination = searchParams.get('destination');
    
    if (!pickup || !destination) {
      return NextResponse.json({ message: 'Missing required parameters: pickup and destination' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const routesCollection = db.collection('routes');

    const route = await routesCollection.findOne({ from: pickup, to: destination });

    if (!route) {
        return NextResponse.json({ message: 'The selected route is not available.' }, { status: 404 });
    }

    return NextResponse.json({ 
        fare: route.fare_per_person_kes
    }, { status: 200 });

  } catch (error) {
    console.error('Error calculating fare:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
