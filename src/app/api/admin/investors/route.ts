
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route, in a real app you'd validate the admin's session.

// GET all investors
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const investors = await db.collection('investors').find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(investors, { status: 200 });
  } catch (error) {
    console.error('Error fetching investors:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a new investor
export async function POST(request: Request) {
  try {
    const { name, sharePercentage } = await request.json();

    if (!name || sharePercentage === undefined) {
      return NextResponse.json({ message: 'Missing required fields: name and sharePercentage' }, { status: 400 });
    }

    const share = parseFloat(sharePercentage);
    if (isNaN(share) || share <= 0 || share > 100) {
        return NextResponse.json({ message: 'Share percentage must be a number between 0 and 100' }, { status: 400 });
    }

    // Optional: Check if total shares exceed 100%
    const client = await clientPromise;
    const db = client.db();
    const investorsCollection = db.collection('investors');

    const totalShares = await investorsCollection.aggregate([
        { $group: { _id: null, total: { $sum: "$sharePercentage" } } }
    ]).toArray();

    if (totalShares.length > 0 && (totalShares[0].total + share) > 100) {
        return NextResponse.json({ message: `Adding this investor would exceed 100% of the platform fee share. Current total: ${totalShares[0].total}%.` }, { status: 400 });
    }


    const newInvestor = {
      name,
      sharePercentage: share,
      createdAt: new Date(),
    };

    const result = await investorsCollection.insertOne(newInvestor);
    return NextResponse.json({ message: 'Investor created successfully', investorId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating investor:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE an investor
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: 'Investor ID is required' }, { status: 400 });
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid Investor ID' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();
        
        const result = await db.collection('investors').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ message: 'Investor not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Investor deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting investor:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
