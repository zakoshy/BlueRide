
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This is a protected route, in a real app you'd validate the admin's session.

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Use an aggregation pipeline to join boats with owners and captains
    const fleet = await db.collection('boats').aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'ownerId',
                foreignField: 'uid',
                as: 'ownerInfo'
            }
        },
        {
            $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'captainId',
                foreignField: 'uid',
                as: 'captainInfo'
            }
        },
        {
            $unwind: { path: "$captainInfo", preserveNullAndEmptyArrays: true }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                capacity: 1,
                licenseNumber: 1,
                isValidated: 1,
                owner: {
                    name: "$ownerInfo.name",
                    email: "$ownerInfo.email"
                },
                captain: {
                     $cond: {
                        if: { $eq: [ "$captainId", null ] },
                        then: null,
                        else: { name: "$captainInfo.name", email: "$captainInfo.email" }
                    }
                }
            }
        },
        {
            $sort: { "owner.name": 1, name: 1 }
        }
    ]).toArray();


    return NextResponse.json(fleet, { status: 200 });
  } catch (error) {
    console.error('Error fetching fleet data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
