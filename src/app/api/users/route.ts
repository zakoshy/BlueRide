
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { uid, email, name } = await request.json();

    if (!uid || !email || !name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(); 

    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ uid });

    if (existingUser) {
        // User already exists, maybe update it or just return success
        return NextResponse.json({ message: 'User already exists', userId: existingUser._id }, { status: 200 });
    }

    const newUser = {
      uid,
      email,
      name,
      role: 'rider', // Default role for new signups
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json({ message: 'User created successfully', userId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error in user creation endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
