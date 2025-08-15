
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the session.

// GET pending proposals for the admin dashboard
export async function GET(request: Request) {
    try {
        const client = await clientPromise;
        const db = client.db();
        
        const proposals = await db.collection('fare_proposals').aggregate([
            {
                $sort: { createdAt: -1 }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'ownerId',
                    foreignField: 'uid',
                    as: 'ownerInfo'
                }
            },
            {
                $lookup: {
                    from: 'routes',
                    localField: 'routeId',
                    foreignField: '_id',
                    as: 'routeInfo'
                }
            },
            { $unwind: '$ownerInfo' },
            { $unwind: '$routeInfo' },
            {
                $project: {
                    _id: 1,
                    proposedFare: 1,
                    status: 1,
                    createdAt: 1,
                    owner: {
                        name: '$ownerInfo.name'
                    },
                    route: {
                        from: '$routeInfo.from',
                        to: '$routeInfo.to',
                        currentFare: '$routeInfo.fare_per_person_kes'
                    }
                }
            }
        ]).toArray();

        return NextResponse.json(proposals, { status: 200 });
    } catch (error) {
        console.error('Error fetching fare proposals:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


// POST new proposals from boat owners
export async function POST(request: Request) {
  try {
    const { ownerId, proposals } = await request.json();

    if (!ownerId || !proposals || !Array.isArray(proposals) || proposals.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const proposalsCollection = db.collection('fare_proposals');

    const newProposals = proposals.map(p => ({
        routeId: new ObjectId(p.routeId),
        ownerId: ownerId,
        proposedFare: Number(p.proposedFare),
        status: 'pending',
        createdAt: new Date(),
    }));

    await proposalsCollection.insertMany(newProposals);

    return NextResponse.json({ message: 'Fare proposals submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating fare proposals:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to approve/reject proposals from admin
export async function PUT(request: Request) {
    try {
        const { proposalId, status } = await request.json();

        if (!proposalId || !status || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();
        const proposalsCollection = db.collection('fare_proposals');
        const routesCollection = db.collection('routes');
        
        const proposal = await proposalsCollection.findOne({ _id: new ObjectId(proposalId) });

        if (!proposal) {
            return NextResponse.json({ message: 'Proposal not found' }, { status: 404 });
        }

        if (proposal.status !== 'pending') {
             return NextResponse.json({ message: 'This proposal has already been processed.' }, { status: 409 });
        }

        // Update the proposal status
        await proposalsCollection.updateOne(
            { _id: new ObjectId(proposalId) },
            { $set: { status: status } }
        );

        // If approved, update the actual route fare
        if (status === 'approved') {
            await routesCollection.updateOne(
                { _id: new ObjectId(proposal.routeId) },
                { $set: { fare_per_person_kes: proposal.proposedFare } }
            );
        }

        return NextResponse.json({ message: `Proposal ${status} successfully` }, { status: 200 });

    } catch (error) {
        console.error('Error processing fare proposal:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

    