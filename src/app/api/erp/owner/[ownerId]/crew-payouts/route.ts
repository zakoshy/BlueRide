
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the owner's session.

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

    // 1. Find all boats owned by the owner
    const ownerBoats = await db.collection('boats').find({ ownerId: ownerId }).project({ _id: 1, captainId: 1 }).toArray();
    const captainIds = ownerBoats.map(boat => boat.captainId).filter(id => id); // Get unique, non-null captain IDs

    if (captainIds.length === 0) {
        return NextResponse.json([], { status: 200 });
    }
    
    // 2. Aggregate trip financials for those captains but only on trips for this owner
    const crewPayouts = await db.collection('trip_financials').aggregate([
        {
            // Filter trips to only those for the specified owner and their captains
            $match: {
                ownerId: ownerId,
                captainId: { $in: captainIds }
            }
        },
        {
            // Group by captain to sum up their commission
            $group: {
                _id: "$captainId",
                totalCommission: { $sum: "$captainCommission" },
                tripCount: { $sum: 1 }
            }
        },
        {
            // Join with users table to get captain's name
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: 'uid',
                as: 'captainInfo'
            }
        },
        {
            $unwind: "$captainInfo"
        },
        {
            // Reshape the output
            $project: {
                _id: 0,
                captainId: "$_id",
                name: "$captainInfo.name",
                email: "$captainInfo.email",
                totalCommission: 1,
                tripCount: 1
            }
        },
        {
           $sort: { totalCommission: -1 }
        }
    ]).toArray();


    return NextResponse.json(crewPayouts, { status: 200 });
  } catch (error) {
    console.error('Error fetching owner crew payouts:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
