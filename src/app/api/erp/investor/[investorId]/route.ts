
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { format } from 'date-fns';

// This is a protected route. In a real app, you'd validate the admin's session.

export async function GET(
  request: Request,
  { params }: { params: { investorId: string } }
) {
  try {
    const investorId = params.investorId;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!investorId) {
      return NextResponse.json({ message: 'Investor ID is required' }, { status: 400 });
    }
     if (!ObjectId.isValid(investorId)) {
      return NextResponse.json({ message: 'Invalid Investor ID' }, { status: 400 });
    }

    let dateFilter: any = { "investorPayouts.investorId": new ObjectId(investorId) };
    if (startDate && endDate) {
        dateFilter.tripCompletedAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        };
    }

    const client = await clientPromise;
    const db = client.db();
    
    const financials = await db.collection('trip_financials').find(dateFilter).toArray();
    
    let totalPayout = 0;
    const dailyPayouts: { [key: string]: number } = {};
    let tripCount = 0;

    financials.forEach(trip => {
        tripCount++;
        const investorPayout = trip.investorPayouts.find((p: any) => p.investorId.toString() === investorId);
        if (investorPayout) {
            totalPayout += investorPayout.payout;
            const day = format(new Date(trip.tripCompletedAt), 'MMM dd');
            if (!dailyPayouts[day]) {
                dailyPayouts[day] = 0;
            }
            dailyPayouts[day] += investorPayout.payout;
        }
    });
    
    const chartData = Object.keys(dailyPayouts)
        .map(date => ({ date, Payout: dailyPayouts[date] }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return NextResponse.json({
        totalPayout,
        tripCount,
        dailyPayouts: chartData
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching investor financial data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
