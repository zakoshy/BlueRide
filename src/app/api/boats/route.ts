
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the admin's session
// and ensure the ownerId matches the logged-in user if they are a boat_owner.

// GET boats for a specific owner
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');

    if (!ownerId) {
      return NextResponse.json({ message: 'Owner ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const boatsCollection = db.collection('boats');

    const boats = await boatsCollection.find({ ownerId: ownerId }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(boats, { status: 200 });
  } catch (error) {
    console.error('Error fetching boats:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a new boat
export async function POST(request: Request) {
  try {
    const { name, capacity, description, ownerId } = await request.json();

    if (!name || !capacity || !ownerId) {
      return NextResponse.json({ message: 'Missing required fields: name, capacity, and ownerId' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const boatsCollection = db.collection('boats');
    const usersCollection = db.collection('users');

    // Verify the owner exists and is a boat owner
    const owner = await usersCollection.findOne({ uid: ownerId, role: 'boat_owner' });
    if (!owner) {
        return NextResponse.json({ message: 'Invalid owner or user is not a boat owner' }, { status: 403 });
    }

    const newBoat = {
      name,
      capacity,
      description,
      ownerId,
      createdAt: new Date(),
    };

    const result = await boatsCollection.insertOne(newBoat);

    return NextResponse.json({ message: 'Boat created successfully', boatId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating boat:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
