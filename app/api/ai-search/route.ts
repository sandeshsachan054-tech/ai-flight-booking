import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const extractPrompt = `You are a flight search assistant. Extract flight search details from: "${query}".
Return ONLY a valid JSON object:
{
  "from": "3-letter origin IATA (e.g. DEL, BOM, BLR, DXB, LHR)",
  "to": "3-letter destination IATA",
  "date": "YYYY-MM-DD"
}
Return raw JSON only without markdown.`;

    const extractResponse = await groq.chat.completions.create({
      messages: [{ role: "user", content: extractPrompt }],
      model: "groq/compound-mini", // JSON extraction ke liye sabse reliable aur ultra-fast model
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const parsedData = JSON.parse(
      extractResponse.choices[0]?.message?.content || "{}"
    );

    return NextResponse.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Flight Search AI Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process search query" },
      { status: 500 }
    );
  }
}