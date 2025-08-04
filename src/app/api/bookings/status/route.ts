
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the boat owner's or captain's session.

// Constants for revenue split
const PLATFORM_FEE_PERCENTAGE = 0.20; // 20%
const CAPTAIN_COMMISSION_PERCENTAGE = 0.10; // 10%

async function createTripFinancials(booking: any) {
    if (!booking || !booking.finalFare) return;

    const fare = booking.finalFare;

    const platformFee = fare * PLATFORM_FEE_PERCENTAGE;
    const captainCommission = (fare - platformFee) * CAPTAIN_COMMISSION_PERCENTAGE;
    const ownerShare = fare - platformFee - captainCommission;

    const financialData = {
        bookingId: booking._id,
        boatId: booking.boatId,
        ownerId: booking.ownerId,
        captainId: booking.captainId,
        tripCompletedAt: new Date(),
        baseFare: booking.baseFare,
        adjustmentPercent: booking.adjustmentPercent,
        finalFare: booking.finalFare,
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
      const { bookingId, status, finalFare, adjustmentPercent } = await request.json();
  
      if (!bookingId || !status) {
        return NextResponse.json({ message: 'Missing required fields: bookingId and status' }, { status: 400 });
      }

      if (!['accepted', 'rejected', 'completed'].includes(status)) {
        return NextResponse.json({ message: 'Invalid status provided. Must be "accepted", "rejected", or "completed".' }, { status: 400 });
      }
      
      if (status === 'accepted' && (finalFare === undefined || adjustmentPercent === undefined)) {
         return NextResponse.json({ message: 'Accepted bookings must have a finalFare and adjustmentPercent' }, { status: 400 });
      }
  
      if (!ObjectId.isValid(bookingId)) {
        return NextResponse.json({ message: 'Invalid bookingId provided' }, { status: 400 });
      }
  
      const client = await clientPromise;
      const db = client.db();
      const bookingsCollection = db.collection('bookings');
  
      const updateData: any = { status };
      if (status === 'accepted') {
        updateData.finalFare = finalFare;
        updateData.adjustmentPercent = adjustmentPercent;
        // Rider has paid, so we confirm the booking
        updateData.status = 'confirmed';
      }

      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: updateData }
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
