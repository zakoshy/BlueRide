
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
             $sort: { createdAt: 1 } 
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
            $unwind: { path: "$riderInfo", preserveNullAndEmptyArrays: true }
        },
        {
            $group: {
                _id: {
                    boatId: "$boatId",
                    pickup: "$pickup",
                    destination: "$destination"
                },
                passengers: { 
                    $push: {
                        bookingId: "$_id",
                        name: { $ifNull: [ "$riderInfo.name", "Unknown Rider" ] },
                        uid: { $ifNull: [ "$riderInfo.uid", "Unknown" ] },
                        bookingType: "$bookingType",
                        seats: "$seats"
                    }
                },
                earliestBookingTime: { $min: "$createdAt" }
            }
        },
        // Stage to get the full boat and location details efficiently
        {
            $lookup: {
                from: 'boats',
                localField: '_id.boatId',
                foreignField: '_id',
                as: 'boat'
            }
        },
        {
             $lookup: {
                from: 'locations',
                localField: '_id.pickup',
                foreignField: 'name',
                as: 'pickupLocation'
            }
        },
        {
            $lookup: {
                from: 'locations',
                localField: '_id.destination',
                foreignField: 'name',
                as: 'destinationLocation'
            }
        },
        {
            $unwind: { path: "$boat", preserveNullAndEmptyArrays: true }
        },
        {
            $unwind: { path: "$pickupLocation", preserveNullAndEmptyArrays: true }
        },
        {
            $unwind: { path: "$destinationLocation", preserveNullAndEmptyArrays: true }
        },
        // Reshape the output
        {
            $project: {
                _id: { $concat: [ { $toString: "$_id.boatId" }, "-", "$_id.pickup", "-", "$_id.destination" ] },
                boat: { 
                    _id: "$boat._id",
                    name: { $ifNull: ["$boat.name", "Unknown Boat"] },
                    licenseNumber: "$boat.licenseNumber"
                },
                pickup: {
                    name: "$_id.pickup",
                    lat: { $ifNull: [ "$pickupLocation.lat", 0 ] },
                    lng: { $ifNull: [ "$pickupLocation.lng", 0 ] }
                },
                destination: {
                    name: "$_id.destination",
                    lat: { $ifNull: [ "$destinationLocation.lat", 0 ] },
                    lng: { $ifNull: [ "$destinationLocation.lng", 0 ] }
                },
                passengers: 1,
                tripDate: "$earliestBookingTime"
            }
        },
        {
            $sort: { tripDate: 1 } // Sort journeys by the earliest booking time
        }
    ]).toArray();

    return NextResponse.json(bookings, { status: 200 });
  } catch (error) {
    console.error('Error fetching captain trips:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
    

    


