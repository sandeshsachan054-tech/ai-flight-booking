import { NextResponse } from 'next/server';
import { Duffel } from '@duffel/api';

const duffel = new Duffel({ token: process.env.DUFFEL_API_TOKEN || '' });

export async function POST(req: Request) {
  try {
    const { selectedOfferId, passengerId } = await req.json();

    if (!selectedOfferId) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
    }

    // Real test order create karke PNR generate karna
    const order = await (duffel.orders.create as any)({
      selected_offers: [selectedOfferId],
      passengers: [
        {
          id: passengerId || 'pas_0000AU4j1W7N4kH2kP3XqE',
          email: 'sandesh@example.com',
          phone_number: '+919876543210',
          given_name: 'Sandesh',
          family_name: 'Sachan',
          gender: 'm',
          title: 'mr',
          born_on: '1998-05-15',
        },
      ],
      type: 'instant',
      payments: [
        {
          type: 'balance',
          currency: 'GBP',
          amount: '0.00',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      bookingRef: order.data?.booking_reference || 'PNR-CONFIRMED',
      orderId: order.data?.id,
    });
  } catch (error: any) {
    console.error('Booking Order Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to book flight' }, { status: 500 });
  }
}