
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// This is a protected route, in a real app you'd validate the admin's or owner's session.

// GET expenses
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boatId = searchParams.get('boatId');
    const ownerId = searchParams.get('ownerId');

    let query: any = {};
    if (boatId) query.boatId = new ObjectId(boatId);
    if (ownerId) query.ownerId = ownerId;

    const client = await clientPromise;
    const db = client.db();
    const expenses = await db.collection('expenses')
        .find(query)
        .sort({ expenseDate: -1 })
        .toArray();

    return NextResponse.json(expenses, { status: 200 });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a new expense
export async function POST(request: Request) {
    try {
        const { boatId, ownerId, category, amount, description } = await request.json();

        if (!boatId || !ownerId || !category || !amount) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const newExpense = {
            boatId: new ObjectId(boatId),
            ownerId,
            category, // e.g., 'fuel', 'maintenance', 'payout'
            amount: Number(amount),
            description,
            expenseDate: new Date(),
        };

        const client = await clientPromise;
        const db = client.db();
        const result = await db.collection('expenses').insertOne(newExpense);

        return NextResponse.json({ message: 'Expense created successfully', expenseId: result.insertedId }, { status: 201 });

    } catch(error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
