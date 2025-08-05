
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the boat owner's session.

export async function PUT(request: Request) {
    try {
      const { bookingId, finalFare, adjustmentPercent } = await request.json();
  
      if (!bookingId || finalFare === undefined || adjustmentPercent === undefined) {
        return NextResponse.json({ message: 'Missing required fields: bookingId, finalFare, and adjustmentPercent' }, { status: 400 });
      }
  
      if (!ObjectId.isValid(bookingId)) {
        return NextResponse.json({ message: 'Invalid bookingId provided' }, { status: 400 });
      }
  
      const client = await clientPromise;
      const db = client.db();
      const bookingsCollection = db.collection('bookings');
  
      // Can only adjust completed bookings, as this is when the fare is set.
      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(bookingId), status: 'completed' }, 
        { $set: { finalFare: finalFare, adjustmentPercent: adjustmentPercent } }
      );
  
      if (result.matchedCount === 0) {
        return NextResponse.json({ message: 'Booking not found or not in a state that can be adjusted' }, { status: 404 });
      }
      
      // Since the fare was adjusted, we must also update the financial record
      const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
      if (booking) {
         const fare = booking.finalFare;
         const PLATFORM_FEE_PERCENTAGE = 0.20;
         const CAPTAIN_COMMISSION_PERCENTAGE = 0.10;
         const platformFee = fare * PLATFORM_FEE_PERCENTAGE;
         const captainCommission = (fare - platformFee) * CAPTAIN_COMMISSION_PERCENTAGE;
         const ownerShare = fare - platformFee - captainCommission;

         await db.collection('trip_financials').updateOne(
            { bookingId: new ObjectId(bookingId) },
            { $set: {
                finalFare: fare,
                adjustmentPercent: booking.adjustmentPercent,
                platformFee: platformFee,
                captainCommission: captainCommission,
                boatOwnerShare: ownerShare
            }}
         );
      }
  
      return NextResponse.json({ message: 'Booking fare adjusted successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error adjusting booking fare:', error);
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
  }
