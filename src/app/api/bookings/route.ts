
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// POST a new booking
export async function POST(request: Request) {
  try {
    const { boatId, riderId, routeId, bookingType, seats } = await request.json();

    if (!boatId || !riderId || !routeId || !bookingType) {
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
    
    // In a real app we'd also check the routeId, but we'll skip for now.

    if (bookingType === 'seat' && seats > boat.capacity) {
        return NextResponse.json({ message: `Number of seats exceeds boat capacity of ${boat.capacity}.` }, { status: 400 });
    }


    const newBooking = {
      boatId: new ObjectId(boatId),
      riderId: rider.uid,
      ownerId: boat.ownerId, // Store owner for easy lookup
      routeId: new ObjectId(routeId),
      bookingType,
      ...(seats && { seats }), // Conditionally add seats
      status: 'pending', // Bookings are pending until owner confirms
      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(newBooking);

    return NextResponse.json({ message: 'Booking created successfully', bookingId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
