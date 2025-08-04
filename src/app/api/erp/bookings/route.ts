
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This is a protected route, in a real app you'd validate the admin's session.

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Fetch all bookings and join with rider and boat info
    const bookings = await db.collection('bookings').aggregate([
        { 
            $sort: { createdAt: -1 } 
        },
        {
            $lookup: {
                from: 'users',
                localField: 'riderId',
                foreignField: 'uid',
                as: 'riderInfo'
            }
        },
        {
            $lookup: {
                from: 'boats',
                localField: 'boatId',
                foreignField: '_id',
                as: 'boatInfo'
            }
        },
        {
            $unwind: { path: "$riderInfo", preserveNullAndEmptyArrays: true }
        },
        {
            $unwind: { path: "$boatInfo", preserveNullAndEmptyArrays: true }
        },
        {
            $project: {
                _id: 1,
                pickup: 1,
                destination: 1,
                status: 1,
                createdAt: 1,
                rider: { name: "$riderInfo.name" },
                boat: { name: "$boatInfo.name" }
            }
        }
    ]).toArray();

    return NextResponse.json(bookings, { status: 200 });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
