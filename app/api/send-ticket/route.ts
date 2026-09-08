import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { toEmail, bookingDetails } = await req.json();

    if (!toEmail || !bookingDetails) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'AIFlights <onboarding@resend.dev>',
      to: [toEmail],
      subject: `✈️ Booking Confirmed: ${bookingDetails.flightNo} (${bookingDetails.from} -> ${bookingDetails.to})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563EB;">Your Flight Booking is Confirmed!</h2>
          <p><strong>Booking PNR:</strong> ${bookingDetails.pnr}</p>
          <p><strong>Flight:</strong> ${bookingDetails.airline} (${bookingDetails.flightNo})</p>
          <p><strong>Route:</strong> ${bookingDetails.from} &rarr; ${bookingDetails.to}</p>
          <p><strong>Departure / Arrival:</strong> ${bookingDetails.dep} - ${bookingDetails.arr}</p>
          <p><strong>Total Paid:</strong> Rs. ${bookingDetails.totalAmount}</p>
          <hr />
          <h4>Passenger(s):</h4>
          <ul>
            ${bookingDetails.passengers.map((p: any) => `<li>${p.name} (Age: ${p.age || 'N/A'})</li>`).join('')}
          </ul>
          <p style="color: green;"><strong>Status: 100% Confirmed</strong></p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}