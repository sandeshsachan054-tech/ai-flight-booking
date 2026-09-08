import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // 1. OpenAI Whisper API: Speech to Text
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    const userText = transcription.text;

    // 2. Groq LLM: Extract From, To, Date
    const extractPrompt = `Extract "from", "to", and "date" from: "${userText}". Return ONLY a valid JSON with keys from, to, date.`;
    const extractResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: extractPrompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
    });
    const { from, to, date } = JSON.parse(extractResponse.choices[0]?.message?.content || "{}");

    // 3. Tavily: Live Flight Search
    const searchQuery = `Current flight schedules and prices from ${from} to ${to} on ${date} in INR`;
    const tvlyResponse = await tvly.search(searchQuery, { searchDepth: "advanced", includeAnswer: true });

    // 4. Clean Data via Groq
    const parsePrompt = `
      Based on this raw web search data: "${tvlyResponse.answer}"
      Create a JSON array of up to 3 flight objects with exact keys: id, airline, flightNo, dep, arr, price (integer in INR), from, to.
      Return ONLY the JSON array.
    `;
    const finalData = await groq.chat.completions.create({
      messages: [{ role: 'user', content: parsePrompt }],
      model: 'openai/gpt-oss-safeguard-20b',
      temperature: 0.1,
    });
    let rawJson = finalData.choices[0]?.message?.content || "[]";
    // Markdown ticks hatane ke liyen cleanup code
    rawJson = rawJson.replace(/'''json/g, "").replace(/'''/g, "").trim(); 
    const liveFlights = JSON.parse(finalData.choices[0]?.message?.content || "[]");

    return NextResponse.json({ transcribedText: userText, flights: liveFlights }, { status: 200 });

  } catch (error) {
    console.error("Voice API Error:", error);
    return NextResponse.json({ error: "Voice processing failed" }, { status: 500 });
  }
}