
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the boat owner's session.

export async function PUT(request: Request) {
    try {
      const { boatId, captainId } = await request.json();
  
      if (!boatId || !captainId) {
        return NextResponse.json({ message: 'Missing required fields: boatId and captainId' }, { status: 400 });
      }
  
      if (!ObjectId.isValid(boatId)) {
        return NextResponse.json({ message: 'Invalid boatId provided' }, { status: 400 });
      }
  
      const client = await clientPromise;
      const db = client.db();
      const boatsCollection = db.collection('boats');
      const usersCollection = db.collection('users');

      // Verify captain exists and has the 'captain' role
      const captain = await usersCollection.findOne({ uid: captainId, role: 'captain'});
      if (!captain) {
        return NextResponse.json({ message: 'The selected user is not a valid captain.' }, { status: 404 });
      }

      const result = await boatsCollection.updateOne(
        { _id: new ObjectId(boatId) },
        { $set: { captainId: captainId } }
      );
  
      if (result.matchedCount === 0) {
        return NextResponse.json({ message: 'Boat not found' }, { status: 404 });
      }
  
      return NextResponse.json({ message: 'Captain assigned successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error assigning captain:', error);
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

    