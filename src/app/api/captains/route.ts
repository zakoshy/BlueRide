
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This is a protected route. In a real app, you'd validate the caller's session.

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    // Find all users with the 'captain' role
    const captains = await usersCollection.find(
        { role: 'captain' },
        { projection: { uid: 1, name: 1, email: 1 } } // Only return necessary fields
    ).toArray();

    return NextResponse.json(captains, { status: 200 });
  } catch (error) {
    console.error('Error fetching captains:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

    