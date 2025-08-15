
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This is a protected route. In a real app, you'd validate the owner's session.

export async function GET(
  request: Request,
  { params }: { params: { ownerId: string } }
) {
  try {
    const ownerId = params.ownerId;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');


    if (!ownerId) {
      return NextResponse.json({ message: 'Owner ID is required' }, { status: 400 });
    }
    
    let dateFilter: any = { ownerId: ownerId };
    if (startDate && endDate) {
        dateFilter.tripCompletedAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        };
    }

    const client = await clientPromise;
    const db = client.db();
    
    const financials = await db.collection('trip_financials').find(dateFilter).toArray();

    const summary = financials.reduce((acc, trip) => {
        acc.totalRevenue += trip.finalFare || 0;
        acc.totalOwnerShare += trip.boatOwnerShare || 0;
        acc.totalCaptainCommission += trip.captainCommission || 0;
        acc.tripCount += 1;
        return acc;
    }, {
        totalRevenue: 0,
        totalOwnerShare: 0,
        totalCaptainCommission: 0,
        tripCount: 0
    });

    return NextResponse.json(summary, { status: 200 });

  } catch (error) {
    console.error('Error fetching owner financial summary:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
