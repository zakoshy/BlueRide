
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route, in a real app you'd validate the admin's session.

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // For now, we fetch all financials. In a real app, add pagination and filtering.
    const financials = await db.collection('trip_financials')
        .find({})
        .sort({ tripCompletedAt: -1 })
        .toArray();

    return NextResponse.json(financials, { status: 200 });
  } catch (error) {
    console.error('Error fetching trip financials:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
