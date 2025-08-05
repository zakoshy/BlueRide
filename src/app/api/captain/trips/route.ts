
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This is a protected route. In a real app, you'd validate the captain's session.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const captainId = searchParams.get('captainId');

    if (!captainId) {
      return NextResponse.json({ message: 'Captain ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Find boats assigned to this captain
    const assignedBoats = await db.collection('boats').find({ captainId: captainId }).project({ _id: 1 }).toArray();
    const assignedBoatIds = assignedBoats.map(b => b._id);

    if (assignedBoatIds.length === 0) {
        return NextResponse.json([], { status: 200 }); // No boats, so no trips
    }

    // Find bookings for those boats that are 'completed' (i.e., paid and ready for departure)
    const bookings = await db.collection('bookings').aggregate([
        {
            $match: { 
                boatId: { $in: assignedBoatIds },
                status: 'completed'
            }
        },
        { 
            $sort: { createdAt: 1 } // Show oldest trips first
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
                seats: 1,
                bookingType: 1,
                createdAt: 1,
                rider: {
                    name: "$riderInfo.name",
                    uid: "$riderInfo.uid"
                },
                boat: {
                    name: "$boatInfo.name",
                    licenseNumber: "$boatInfo.licenseNumber"
                }
            }
        }
    ]).toArray();


    return NextResponse.json(bookings, { status: 200 });
  } catch (error) {
    console.error('Error fetching captain trips:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
