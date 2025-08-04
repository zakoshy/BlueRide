
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the boat owner's or captain's session.

// Constants for revenue split
const PLATFORM_FEE_PERCENTAGE = 0.20; // 20%
const CAPTAIN_COMMISSION_PERCENTAGE = 0.10; // 10%

async function createTripFinancials(booking: any) {
    if (!booking) return;

    // A simple fare calculation logic. This can be made more complex.
    // e.g., base fare + per km/mile rate + per minute rate
    const fare = booking.bookingType === 'whole_boat' ? 2000 : (booking.seats || 1) * 150;

    const platformFee = fare * PLATFORM_FEE_PERCENTAGE;
    const captainCommission = (fare - platformFee) * CAPTAIN_COMMISSION_PERCENTAGE;
    const ownerShare = fare - platformFee - captainCommission;

    const financialData = {
        bookingId: booking._id,
        boatId: booking.boatId,
        ownerId: booking.ownerId,
        captainId: booking.captainId,
        tripCompletedAt: new Date(),
        totalFare: fare,
        platformFee: platformFee,
        captainCommission: captainCommission,
        boatOwnerShare: ownerShare,
    };

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection('trip_financials').insertOne(financialData);
        console.log(`Financial record created for booking ${booking._id}`);
    } catch (error) {
        console.error('Error creating trip financial record:', error);
        // We don't want to fail the whole request if this fails, but we should log it.
    }
}


export async function PUT(request: Request) {
    try {
      const { bookingId, status } = await request.json();
  
      if (!bookingId || !status) {
        return NextResponse.json({ message: 'Missing required fields: bookingId and status' }, { status: 400 });
      }

      if (!['accepted', 'rejected', 'completed'].includes(status)) {
        return NextResponse.json({ message: 'Invalid status provided. Must be "accepted", "rejected", or "completed".' }, { status: 400 });
      }
  
      if (!ObjectId.isValid(bookingId)) {
        return NextResponse.json({ message: 'Invalid bookingId provided' }, { status: 400 });
      }
  
      const client = await clientPromise;
      const db = client.db();
      const bookingsCollection = db.collection('bookings');
  
      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: { status: status } }
      );
  
      if (result.matchedCount === 0) {
        return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
      }
      
      // If trip is completed, generate financial record
      if (status === 'completed') {
        const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
        const boat = await db.collection('boats').findOne({_id: booking?.boatId});
        // Pass captainId from the boat to the booking record for financials
        if (boat?.captainId) {
            await bookingsCollection.updateOne({ _id: new ObjectId(bookingId) }, { $set: { captainId: boat.captainId } });
        }
        const updatedBooking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
        await createTripFinancials(updatedBooking);
      }
  
      return NextResponse.json({ message: 'Booking status updated successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error updating booking status:', error);
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
  }
