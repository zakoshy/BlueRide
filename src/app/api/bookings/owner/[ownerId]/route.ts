
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route, in a real app you'd validate the owner's session.

export async function GET(
  request: Request,
  { params }: { params: { ownerId: string } }
) {
  try {
    const ownerId = params.ownerId;

    if (!ownerId) {
      return NextResponse.json({ message: 'Owner ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    const bookings = await db.collection('bookings').aggregate([
        {
            $match: { ownerId: ownerId }
        },
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
                boatId: 1,
                riderId: 1,
                pickup: 1,
                destination: 1,
                bookingType: 1,
                seats: 1,
                status: 1,
                createdAt: 1,
                baseFare: 1,
                finalFare: 1,
                rider: {
                    name: "$riderInfo.name"
                },
                boat: {
                    name: "$boatInfo.name"
                }
            }
        }
    ]).toArray();

    return NextResponse.json(bookings, { status: 200 });
  } catch (error) {
    console.error('Error fetching owner bookings:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

    