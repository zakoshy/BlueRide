
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route. In a real app, you'd validate the admin's session
// and ensure the ownerId matches the logged-in user if they are a boat_owner.

// GET boats 
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const isValidated = searchParams.get('validated');
    const routeId = searchParams.get('routeId');
    const type = searchParams.get('type');
    const county = searchParams.get('county');

    let query: any = {};

    if (ownerId) {
      query.ownerId = ownerId;
    }
    
    if (isValidated) {
        query.isValidated = true;
    }
    
    if (type) {
        if (type.includes(',')) {
            query.type = { $in: type.split(',') };
        } else {
            query.type = type;
        }
    }
    
    if (county) {
        query.homeCounty = county;
    }

    if (routeId) {
        if (!ObjectId.isValid(routeId)) {
            return NextResponse.json({ message: 'Invalid routeId provided' }, { status: 400 });
        }
        query.routeIds = new ObjectId(routeId);
    }

    const client = await clientPromise;
    const db = client.db();
    const boatsCollection = db.collection('boats');

    const boats = await boatsCollection.find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(boats, { status: 200 });
  } catch (error) {
    console.error('Error fetching boats:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a new boat
export async function POST(request: Request) {
  try {
    const { name, capacity, description, ownerId, licenseNumber, type, routeIds, homeCounty } = await request.json();

    if (!name || !capacity || !ownerId || !licenseNumber || !type) {
      return NextResponse.json({ message: 'Missing required fields: name, capacity, ownerId, licenseNumber, and type' }, { status: 400 });
    }

    if ((type === 'luxury' || type === 'speed') && !homeCounty) {
        return NextResponse.json({ message: 'Home county is required for luxury and speed boats' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const boatsCollection = db.collection('boats');
    const usersCollection = db.collection('users');

    // Verify the owner exists and is a boat owner or admin
    const owner = await usersCollection.findOne({ uid: ownerId, role: { $in: ['boat_owner', 'admin'] } });
    if (!owner) {
        return NextResponse.json({ message: 'Invalid owner or user is not a boat owner' }, { status: 403 });
    }

    const newBoat: any = {
      name,
      capacity: parseInt(capacity, 10),
      description,
      ownerId,
      licenseNumber,
      type, // 'standard', 'luxury', 'speed'
      isValidated: false,
      captainId: null, // Captain is not assigned on creation
      createdAt: new Date(),
    };
    
    if (type === 'standard') {
        newBoat.routeIds = Array.isArray(routeIds) ? routeIds.map(id => new ObjectId(id)) : [];
    } else {
        newBoat.homeCounty = homeCounty;
    }


    const result = await boatsCollection.insertOne(newBoat);

    return NextResponse.json({ message: 'Boat created successfully', boatId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating boat:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to update a boat (e.g., for validation)
export async function PUT(request: Request) {
    try {
      const { boatId, isValidated } = await request.json();
  
      if (!boatId || typeof isValidated !== 'boolean') {
        return NextResponse.json({ message: 'Missing required fields: boatId and isValidated' }, { status: 400 });
      }
  
      if (!ObjectId.isValid(boatId)) {
        return NextResponse.json({ message: 'Invalid boatId provided' }, { status: 400 });
      }
  
      const client = await clientPromise;
      const db = client.db();
      const boatsCollection = db.collection('boats');
  
      const result = await boatsCollection.updateOne(
        { _id: new ObjectId(boatId) },
        { $set: { isValidated: isValidated } }
      );
  
      if (result.matchedCount === 0) {
        return NextResponse.json({ message: 'Boat not found' }, { status: 404 });
      }
  
      return NextResponse.json({ message: 'Boat validation status updated successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error updating boat validation status:', error);
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
  }
