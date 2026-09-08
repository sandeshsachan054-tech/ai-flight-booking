import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Fetch all bookings from DB
export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ bookings: [] });
    }
    const client = await clientPromise;
    const db = client.db('flight_db');
    const bookings = await db.collection('bookings').find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ bookings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Save a new booking to DB
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ success: true, localOnly: true });
    }
    const client = await clientPromise;
    const db = client.db('flight_db');
    const result = await db.collection('bookings').insertOne({
      ...body,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}