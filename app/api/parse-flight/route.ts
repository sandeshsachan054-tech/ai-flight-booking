import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { Duffel } from '@duffel/api';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const duffel = new Duffel({ token: process.env.DUFFEL_API_TOKEN || '' });

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    // 1. Natural language se IATA Codes aur Future Date nikalna
    const extractPrompt = `Extract flight search details from: "${query}".
Return ONLY a valid JSON object:
{
  "from": "3-letter origin IATA (e.g. DEL, BOM, BLR, DXB, LHR)",
  "to": "3-letter destination IATA",
  "date": "YYYY-MM-DD" (must be a future date in 2026, default to "2026-10-20" if no date mentioned)
}
Return raw JSON only without markdown.`;

    const extractResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: extractPrompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,
    });

    let rawExtract = extractResponse.choices[0]?.message?.content || '{}';
    rawExtract = rawExtract.replace(/```json/g, '').replace(/```/g, '').trim();
    const { from = 'DEL', to = 'BOM', date = '2026-10-20' } = JSON.parse(rawExtract);

    // 2. Real Duffel Live Flight Search
    const offerRequest = await (duffel.offerRequests.create as any)({
      slices: [
        {
          origin: from,
          destination: to,
          departure_date: date,
        },
      ],
      passengers: [{ type: 'adult' }],
      cabin_class: 'economy',
    });
    // 3. Data format mapping
    const liveFlights = offerRequest.data.offers.slice(0, 5).map((offer: any) => {
      const slice = offer.slices[0];
      const segment = slice.segments[0];
      const lastSegment = slice.segments[slice.segments.length - 1];

      return {
        id: offer.id,
        airline: segment.operating_carrier?.name || 'Commercial Airline',
        flightNo: `${segment.operating_carrier?.iata_code || 'FL'}-${segment.operating_carrier_flight_number || '101'}`,
        from: segment.origin.iata_code,
        to: lastSegment.destination.iata_code,
        dep: segment.departing_at.split('T')[1].substring(0, 5),
        arr: lastSegment.arriving_at.split('T')[1].substring(0, 5),
        price: `₹${Math.round(parseFloat(offer.total_amount) * 90)}`,
        offerId: offer.id,
        passengerId: offer.passengers[0]?.id,
      };
    });

    return NextResponse.json(liveFlights);
  } catch (error) {
    console.error('Duffel API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch live flights' }, { status: 500 });
  }
}