import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a flight search assistant. Extract flight search details from this query: "${query}".
Return ONLY a valid JSON object matching this schema, without markdown blocks:
{
  "from": "3-letter airport code or city name in uppercase (e.g. DEL, BOM, BLR, GOI, DXB)",
  "to": "3-letter airport code or city name in uppercase",
  "passengers": number (default 1)
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/json|/g, '');
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error('AI Parse Error:', err);
    return NextResponse.json({ error: 'Failed to process natural language query' }, { status: 500 });
  }
}