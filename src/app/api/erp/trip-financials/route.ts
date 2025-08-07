
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route, in a real app you'd validate the admin's session.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter = {
            tripCompletedAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            }
        };
    }

    const client = await clientPromise;
    const db = client.db();
    
    const financials = await db.collection('trip_financials')
        .find(dateFilter)
        .sort({ tripCompletedAt: -1 })
        .toArray();

    return NextResponse.json(financials, { status: 200 });
  } catch (error) {
    console.error('Error fetching trip financials:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

