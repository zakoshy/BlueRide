
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Constants for revenue split
const PLATFORM_FEE_PERCENTAGE = 0.20; // 20%
const CAPTAIN_COMMISSION_PERCENTAGE = 0.10; // 10%

async function createTripFinancials(booking: any) {
    if (!booking || !booking.finalFare) return;

    const client = await clientPromise;
    const db = client.db();

    // Get the boat to find the captain
    const boat = await db.collection('boats').findOne({ _id: new ObjectId(booking.boatId) });

    const fare = booking.finalFare;
    const platformFee = fare * PLATFORM_FEE_PERCENTAGE;

    // --- Investor Payout Calculation ---
    const investors = await db.collection('investors').find({}).toArray();
    let totalInvestorShare = 0;
    const investorPayouts = investors.map(investor => {
        const investorShare = platformFee * (investor.sharePercentage / 100);
        totalInvestorShare += investorShare;
        return {
            investorId: investor._id,
            name: investor.name,
            sharePercentage: investor.sharePercentage,
            payout: investorShare
        };
    });

    // The platform's net share after paying investors
    const platformShare = platformFee - totalInvestorShare;
    // --- End Investor Calculation ---

    const captainCommission = (fare - platformFee) * CAPTAIN_COMMISSION_PERCENTAGE;
    const ownerShare = fare - platformFee - captainCommission;

    const financialData = {
        bookingId: booking._id,
        boatId: booking.boatId,
        ownerId: booking.ownerId,
        captainId: boat?.captainId || null,
        tripCompletedAt: new Date(),
        baseFare: booking.baseFare,
        luggageFee: booking.luggageFee,
        adjustmentPercent: booking.adjustmentPercent,
        finalFare: booking.finalFare,
        platformFee: platformFee,
        captainCommission: captainCommission,
        boatOwnerShare: ownerShare,
        platformShare: platformShare, // Store net platform share
        investorPayouts: investorPayouts, // Store detailed investor payouts
    };

    try {
        await db.collection('trip_financials').insertOne(financialData);
        console.log(`Financial record created for booking ${booking._id}`);
    } catch (error) {
        console.error('Error creating trip financial record:', error);
    }
}


// POST a new booking
export async function POST(request: Request) {
  try {
    const { boatId, riderId, pickup, destination, bookingType, seats, baseFare, luggageWeight, luggageFee, finalFare } = await request.json();

    if (!boatId || !riderId || !pickup || !destination || !bookingType || !baseFare || !finalFare) {
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
      luggageWeight: luggageWeight || 0,
      luggageFee: luggageFee || 0,
      finalFare: finalFare,
      adjustmentPercent: 0, // Initially, no adjustment
      status: 'completed', // Auto-complete bookings upon creation/payment
      hasBeenReviewed: false, // New field for tracking reviews
      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(newBooking);
    
    // Create the financial record immediately
    const insertedBooking = { ...newBooking, _id: result.insertedId };
    await createTripFinancials(insertedBooking);


    return NextResponse.json({ message: 'Booking completed successfully', bookingId: result.insertedId }, { status: 201 });
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
                    luggageFee: 1,
                    hasBeenReviewed: 1, // Pass this to the frontend
                    boat: { 
                        name: '$boatInfo.name',
                        capacity: '$boatInfo.capacity'
                    }
                }
            }
        ]).toArray();

        return NextResponse.json(bookings, { status: 200 });

    } catch (error) {
        console.error('Error fetching rider bookings:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a booking
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const riderId = searchParams.get('riderId'); // For validation

    if (!bookingId || !riderId) {
      return NextResponse.json({ message: 'Booking ID and Rider ID are required' }, { status: 400 });
    }

    if (!ObjectId.isValid(bookingId)) {
      return NextResponse.json({ message: 'Invalid Booking ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const bookingsCollection = db.collection('bookings');

    // To ensure a user can only delete their own booking, we match both id and riderId
    const result = await bookingsCollection.deleteOne({
      _id: new ObjectId(bookingId),
      riderId: riderId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Booking not found or you do not have permission to delete it' }, { status: 404 });
    }
    
    // Also delete associated financial record
    await db.collection('trip_financials').deleteOne({ bookingId: new ObjectId(bookingId) });


    return NextResponse.json({ message: 'Booking cancelled successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

    