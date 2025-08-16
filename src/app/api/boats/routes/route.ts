
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the boat owner's session.

// GET a boat's routes
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const boatId = searchParams.get('boatId');

        if (!boatId || !ObjectId.isValid(boatId)) {
            return NextResponse.json({ message: 'A valid boatId is required' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();
        
        const boat = await db.collection('boats').findOne(
            { _id: new ObjectId(boatId) },
            { projection: { routeIds: 1 } }
        );

        if (!boat) {
            return NextResponse.json({ message: 'Boat not found' }, { status: 404 });
        }
        
        // Fetch the full route details for the IDs
        const routes = await db.collection('routes').find({
            _id: { $in: boat.routeIds || [] }
        }).toArray();

        return NextResponse.json(routes, { status: 200 });
    } catch (error) {
        console.error('Error fetching boat routes:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


// PUT to update a boat's assigned routes
export async function PUT(request: Request) {
    try {
      const { boatId, routeIds } = await request.json();
  
      if (!boatId || !Array.isArray(routeIds)) {
        return NextResponse.json({ message: 'Missing required fields: boatId and routeIds array' }, { status: 400 });
      }
  
      if (!ObjectId.isValid(boatId)) {
        return NextResponse.json({ message: 'Invalid boatId provided' }, { status: 400 });
      }
      
      const objectIdRouteIds = routeIds.map(id => new ObjectId(id));
  
      const client = await clientPromise;
      const db = client.db();
      const boatsCollection = db.collection('boats');
  
      const result = await boatsCollection.updateOne(
        { _id: new ObjectId(boatId) },
        { $set: { routeIds: objectIdRouteIds } }
      );
  
      if (result.matchedCount === 0) {
        return NextResponse.json({ message: 'Boat not found' }, { status: 404 });
      }
  
      return NextResponse.json({ message: 'Boat routes updated successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error updating boat routes:', error);
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
