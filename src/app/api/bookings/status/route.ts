
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the boat owner's or captain's session.

export async function PUT(request: Request) {
    try {
      const { bookingId, status } = await request.json();
  
      if (!bookingId || !status) {
        return NextResponse.json({ message: 'Missing required fields: bookingId and status' }, { status: 400 });
      }

      // This endpoint is now only for rejections. Completions are handled at booking creation.
      if (status !== 'rejected') {
        return NextResponse.json({ message: 'Invalid status provided. Only "rejected" is allowed.' }, { status: 400 });
      }
  
      if (!ObjectId.isValid(bookingId)) {
        return NextResponse.json({ message: 'Invalid bookingId provided' }, { status: 400 });
      }
  
      const client = await clientPromise;
      const db = client.db();
      const bookingsCollection = db.collection('bookings');
  
      const updateData: any = { status };
      
      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: updateData }
      );
  
      if (result.matchedCount === 0) {
        return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
      }
      
      // If a booking is rejected, we should remove its financial record if it exists
      await db.collection('trip_financials').deleteOne({ bookingId: new ObjectId(bookingId) });
  
      return NextResponse.json({ message: 'Booking status updated successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error updating booking status:', error);
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
  }
