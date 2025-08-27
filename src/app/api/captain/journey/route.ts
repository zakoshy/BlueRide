
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
        platformShare: platformShare,
        investorPayouts: investorPayouts,
    };

    try {
        // Use updateOne with upsert to avoid creating duplicate financial records
        await db.collection('trip_financials').updateOne(
            { bookingId: booking._id },
            { $set: financialData },
            { upsert: true }
        );
        console.log(`Financial record created/updated for booking ${booking._id}`);
    } catch (error) {
        console.error('Error creating trip financial record:', error);
    }
}

// In a real app, you would protect this route and validate the captain's session.
export async function POST(request: Request) {
    try {
        const { bookingIds, status } = await request.json();

        if (!bookingIds || !Array.isArray(bookingIds) || !status) {
            return NextResponse.json({ message: 'Missing required fields: bookingIds and status' }, { status: 400 });
        }

        if (!['completed', 'cancelled'].includes(status)) {
            return NextResponse.json({ message: 'Invalid status provided' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();
        const bookingsCollection = db.collection('bookings');
        const objectBookingIds = bookingIds.map(id => new ObjectId(id));

        // Update the status for all bookings in the journey
        const updateResult = await bookingsCollection.updateMany(
            { _id: { $in: objectBookingIds } },
            { $set: { status: status } }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({ message: 'No matching bookings found to update' }, { status: 404 });
        }

        // If the journey is completed, create financial records for each booking
        if (status === 'completed') {
            const completedBookings = await bookingsCollection.find({ _id: { $in: objectBookingIds } }).toArray();
            for (const booking of completedBookings) {
                await createTripFinancials(booking);
            }
        }
        
        // If journey is cancelled, move bookings to cancelled collection for refunds
        if (status === 'cancelled') {
             const bookingsToCancel = await bookingsCollection.find({ _id: { $in: objectBookingIds } }).toArray();
             if(bookingsToCancel.length > 0) {
                const cancelledDocs = bookingsToCancel.map(b => ({
                    ...b,
                    cancelledAt: new Date(),
                    status: 'cancelled',
                    refundStatus: 'pending' // For the refund process
                }));
                await db.collection('cancelled_bookings').insertMany(cancelledDocs);
                await bookingsCollection.deleteMany({ _id: { $in: objectBookingIds } });
             }
        }

        return NextResponse.json({ message: `Journey marked as ${status} successfully` }, { status: 200 });

    } catch (error) {
        console.error(`Error updating journey status:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
