
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This is a protected route, in a real app you'd validate the admin's session.

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Aggregation to get captain performance
    const crewPerformance = await db.collection('users').aggregate([
        {
            $match: { role: 'captain' } // Filter for captains only
        },
        {
            $lookup: {
                from: 'trip_financials',
                localField: 'uid',
                foreignField: 'captainId',
                as: 'trips'
            }
        },
        {
            $project: {
                _id: 1,
                uid: 1,
                name: 1,
                email: 1,
                tripCount: { $size: "$trips" },
                totalCommission: { $sum: "$trips.captainCommission" }
            }
        },
        {
            $sort: { totalCommission: -1 }
        }
    ]).toArray();

    return NextResponse.json(crewPerformance, { status: 200 });
  } catch (error) {
    console.error('Error fetching crew data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
