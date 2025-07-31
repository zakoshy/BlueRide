
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: Request,
  { params }: { params: { uid: string } }
) {
  try {
    const uid = params.uid;
    const { role } = await request.json();

    if (!uid) {
      return NextResponse.json({ message: 'User UID is required' }, { status: 400 });
    }

    if (role !== 'boat_owner') {
        // For now, we only allow upgrading to boat_owner
        return NextResponse.json({ message: 'Invalid role specified' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { uid: uid },
      { $set: { role: role } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User role updated successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error updating user role:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

    