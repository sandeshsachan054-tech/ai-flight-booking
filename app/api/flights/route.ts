import { NextResponse } from 'next/server';
import { Duffel } from '@duffel/api';

const duffel = new Duffel({
  token: process.env.DUFFEL_API_TOKEN || '',
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || 'DEL';
  const to = searchParams.get('to') || 'BOM';
  const passengersCount = Number(searchParams.get('passengers')) || 1;

  try {
    // Departure date format (YYYY-MM-DD)
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() + 7); // Default: 7 din baad ki live inventory
    const formattedDate = departureDate.toISOString().split('T')[0];

    // Passengers list format for Duffel
    const passengersPayload = Array.from({ length: passengersCount }, () => ({ type: 'adult' as const }));

    // Real Flight Offers Search
    const offerRequest = await duffel.offerRequests.create({
      slices: [
        {
          origin: from,
          destination: to,
          departure_date: formattedDate,
        },
      ] as any,
      passengers: passengersPayload,
      cabin_class: 'economy',
    });

    const offers = offerRequest.data.offers.slice(0, 6);

    if (offers && offers.length > 0) {
      const realFlights = offers.map((offer: any) => {
        const slice = offer.slices[0];
        const segment = slice.segments[0];
        const rawPrice = parseFloat(offer.total_amount);
        const numericPrice = Math.round(rawPrice * (offer.total_currency === 'INR' ? 1 : 85));

        return {
          id: offer.id,
          airline: offer.owner.name,
          flightNo: segment?.marketing_carrier_flight_number 
            ? `${segment?.marketing_carrier?.iata_code || 'IX'}-${segment.marketing_carrier_flight_number}`
            : `${segment?.operating_carrier?.iata_code || 'IX'}-${segment?.operating_carrier_flight_number || Math.floor(100 + Math.random() * 900)}`,
          from: segment.origin.iata_code,
          to: segment.destination.iata_code,
          dep: new Date(segment.departing_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          arr: new Date(segment.arriving_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: slice.duration.replace('PT', '').toLowerCase(),
          durationMinutes: 120,
          price: `₹${numericPrice.toLocaleString('en-IN')}`,
          numericPrice,
        };
      });

      return NextResponse.json({ success: true, flights: realFlights });
    }

    return NextResponse.json({ success: true, flights: [] });
  } catch (error: any) {
    console.error('Duffel API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}