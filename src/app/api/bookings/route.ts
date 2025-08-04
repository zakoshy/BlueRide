
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// POST a new booking
export async function POST(request: Request) {
  try {
    const { boatId, riderId, pickup, destination, bookingType, seats, baseFare } = await request.json();

    if (!boatId || !riderId || !pickup || !destination || !bookingType || !baseFare) {
      return NextResponse.json({ message: 'Missing required booking fields' }, { status: 400 });
    }

    if (bookingType === 'seat' && (!seats || seats < 1)) {
       return NextResponse.json({ message: 'Seat booking must specify at least 1 seat' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const bookingsCollection = db.collection('bookings');
    const boatsCollection = db.collection('boats');
    const usersCollection = db.collection('users');

    // Verify boat, rider, and route exist
    const boat = await boatsCollection.findOne({ _id: new ObjectId(boatId), isValidated: true });
    if (!boat) {
        return NextResponse.json({ message: 'The selected boat is not valid or available.' }, { status: 404 });
    }

    const rider = await usersCollection.findOne({ uid: riderId });
    if (!rider) {
        return NextResponse.json({ message: 'Rider profile not found.' }, { status: 404 });
    }
    
    // Check boat capacity
    if (bookingType === 'seat' && seats > boat.capacity) {
        return NextResponse.json({ message: `Number of seats exceeds boat capacity of ${boat.capacity}.` }, { status: 400 });
    }

    const newBooking = {
      boatId: new ObjectId(boatId),
      riderId: rider.uid,
      ownerId: boat.ownerId, // Store owner for easy lookup
      pickup,
      destination,
      bookingType,
      ...(seats && { seats }), // Conditionally add seats
      baseFare,
      finalFare: baseFare, // Initially, final fare is the base fare
      adjustmentPercent: 0, // Initially, no adjustment
      status: 'confirmed', // Auto-confirm bookings
      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(newBooking);

    return NextResponse.json({ message: 'Booking request sent successfully', bookingId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// GET bookings for a specific rider
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const riderId = searchParams.get('riderId');

        if (!riderId) {
            return NextResponse.json({ message: 'Rider ID is required' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();
        const bookings = await db.collection('bookings').aggregate([
            { $match: { riderId: riderId } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'boats',
                    localField: 'boatId',
                    foreignField: '_id',
                    as: 'boatInfo'
                }
            },
            { $unwind: { path: '$boatInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    pickup: 1,
                    destination: 1,
                    status: 1,
                    createdAt: 1,
                    bookingType: 1,
                    seats: 1,
                    baseFare: 1,
                    finalFare: 1,
                    boat: { name: '$boatInfo.name' }
                }
            }
        ]).toArray();

        return NextResponse.json(bookings, { status: 200 });

    } catch (error) {
        console.error('Error fetching rider bookings:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
