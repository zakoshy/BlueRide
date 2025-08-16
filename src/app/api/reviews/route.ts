
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the session.

// POST a new review
export async function POST(request: Request) {
  try {
    const { bookingId, rating, comment } = await request.json();

    if (!bookingId || !rating) {
      return NextResponse.json({ message: 'Missing required fields: bookingId and rating' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const bookingsCollection = db.collection('bookings');
    const reviewsCollection = db.collection('reviews');

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }
    if (booking.status !== 'completed') {
        return NextResponse.json({ message: 'You can only review completed trips.' }, { status: 400 });
    }
    if (booking.hasBeenReviewed) {
        return NextResponse.json({ message: 'This trip has already been reviewed.' }, { status: 409 });
    }

    const newReview = {
      bookingId: booking._id,
      boatId: booking.boatId,
      ownerId: booking.ownerId,
      riderId: booking.riderId,
      rating: Number(rating),
      comment: comment || "",
      createdAt: new Date(),
    };

    const result = await reviewsCollection.insertOne(newReview);
    
    // Mark the booking as reviewed
    await bookingsCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: { hasBeenReviewed: true } }
    );

    return NextResponse.json({ message: 'Review submitted successfully', reviewId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// GET all reviews (for admin)
export async function GET(request: Request) {
    try {
        const client = await clientPromise;
        const db = client.db();

        const reviews = await db.collection('reviews').aggregate([
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'riderId',
                    foreignField: 'uid',
                    as: 'riderInfo'
                }
            },
            {
                $lookup: {
                    from: 'boats',
                    localField: 'boatId',
                    foreignField: '_id',
                    as: 'boatInfo'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'ownerId',
                    foreignField: 'uid',
                    as: 'ownerInfo'
                }
            },
            { $unwind: { path: '$riderInfo', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$boatInfo', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$ownerInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    rating: 1,
                    comment: 1,
                    createdAt: 1,
                    rider: { name: '$riderInfo.name' },
                    boat: { name: '$boatInfo.name' },
                    owner: { name: '$ownerInfo.name' }
                }
            }
        ]).toArray();

        return NextResponse.json(reviews, { status: 200 });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

    