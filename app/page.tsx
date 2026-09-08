'use client';

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

interface Passenger {
  name: string;
  age: string;
  outboundSeat?: string;
  returnSeat?: string;
}

interface Flight {
  id: string;
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  dep: string;
  arr: string;
  duration: string;
  durationMinutes: number;
  price: string;
  numericPrice: number;
}

interface BookingRecord {
  pnr: string;
  paymentId: string;
  tripType: 'one-way' | 'round-trip';
  outboundFlight: Flight;
  returnFlight?: Flight;
  passengers: Passenger[];
  totalAmount: number;
  date: string;
}

const ALL_SEATS = [
  ['1A', '1B', '1C', '1D', '1E', '1F'],
  ['2A', '2B', '2C', '2D', '2E', '2F'],
  ['3A', '3B', '3C', '3D', '3E', '3F'],
  ['4A', '4B', '4C', '4D', '4E', '4F'],
  ['5A', '5B', '5C', '5D', '5E', '5F'],
];

// Helper: Dynamic flight list generator based on extracted AI route
const generateFlightsForRoute = (from: string, to: string, prefix: 'out' | 'ret'): Flight[] => {
  return [
    {
      id: `${prefix}_1`,
      airline: 'IndiGo',
      flightNo: prefix === 'out' ? '6E-204' : '6E-512',
      from,
      to,
      dep: prefix === 'out' ? '08:30 AM' : '09:00 AM',
      arr: prefix === 'out' ? '10:45 AM' : '11:15 AM',
      duration: '2h 15m',
      durationMinutes: 135,
      price: '₹4,850',
      numericPrice: 4850,
    },
    {
      id: `${prefix}_2`,
      airline: 'Air India',
      flightNo: prefix === 'out' ? 'AI-102' : 'AI-105',
      from,
      to,
      dep: prefix === 'out' ? '11:00 AM' : '04:00 PM',
      arr: prefix === 'out' ? '01:15 PM' : '06:15 PM',
      duration: '2h 15m',
      durationMinutes: 135,
      price: '₹5,420',
      numericPrice: 5420,
    },
    {
      id: `${prefix}_3`,
      airline: prefix === 'out' ? 'Vistara' : 'Akasa Air',
      flightNo: prefix === 'out' ? 'UK-955' : 'QP-144',
      from,
      to,
      dep: prefix === 'out' ? '06:00 PM' : '08:30 PM',
      arr: prefix === 'out' ? '08:10 PM' : '10:40 PM',
      duration: '2h 10m',
      durationMinutes: 130,
      price: prefix === 'out' ? '₹6,150' : '₹4,300',
      numericPrice: prefix === 'out' ? 6150 : 4300,
    },
  ];
};

export default function Home() {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Dynamic Route States
  const [origin, setOrigin] = useState<string>('DEL');
  const [destination, setDestination] = useState<string>('BOM');

  // Flight Catalogs (Dynamic)
  const [outboundCatalog, setOutboundCatalog] = useState<Flight[]>(() => generateFlightsForRoute('DEL', 'BOM', 'out'));
  const [returnCatalog, setReturnCatalog] = useState<Flight[]>(() => generateFlightsForRoute('BOM', 'DEL', 'ret'));

  // Selected Flights
  const [selectedOutbound, setSelectedOutbound] = useState<Flight | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Flight | null>(null);

  // Seat Selector State
  const [seatModalType, setSeatModalType] = useState<'outbound' | 'return' | null>(null);
  const [activePassengerSeatIndex, setActivePassengerSeatIndex] = useState<number>(0);

  // Filter & Sort
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'duration'>('price-asc');
  const [airlineFilter, setAirlineFilter] = useState<string>('ALL');

  // Dynamic Passengers & Contact
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: 'Sandesh Kumar', age: '24', outboundSeat: '1A', returnSeat: '1F' },
  ]);
  const [contactEmail, setContactEmail] = useState('sandesh@example.com');
  const [contactPhone, setContactPhone] = useState('9876543210');

  // Bookings History State
  const [history, setHistory] = useState<BookingRecord[]>([]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.bookings && data.bookings.length > 0) {
        setHistory(data.bookings);
        return;
      }
    } catch (e) {
      console.log('Fetching local fallback');
    }
    const saved = localStorage.getItem('flight_bookings');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const saveBookingToDBAndLocal = async (record: BookingRecord) => {
    const updated = [record, ...history];
    setHistory(updated);
    localStorage.setItem('flight_bookings', JSON.stringify(updated));

    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (e) {
      console.error('Database save failed:', e);
    }
  };

  const addPassenger = () => setPassengers([...passengers, { name: '', age: '', outboundSeat: '', returnSeat: '' }]);
  const removePassenger = (index: number) => {
    if (passengers.length > 1) setPassengers(passengers.filter((_, i) => i !== index));
  };
  const handlePassengerChange = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const handleSeatSelect = (seat: string) => {
    const updated = [...passengers];
    if (seatModalType === 'outbound') {
      updated[activePassengerSeatIndex].outboundSeat = seat;
    } else {
      updated[activePassengerSeatIndex].returnSeat = seat;
    }
    setPassengers(updated);
  };

  const processFlightList = (list: Flight[]) => {
    let res = [...list];
    if (airlineFilter !== 'ALL') res = res.filter((f) => f.airline === airlineFilter);
    if (sortBy === 'price-asc') res.sort((a, b) => a.numericPrice - b.numericPrice);
    else if (sortBy === 'price-desc') res.sort((a, b) => b.numericPrice - a.numericPrice);
    else if (sortBy === 'duration') res.sort((a, b) => a.durationMinutes - b.durationMinutes);
    return res;
  };

  const handleAISearch = async (queryText?: string) => {
    const text = queryText || searchQuery;
    if (!text.trim()) return;

    setIsSearchingAI(true);
    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const responseData = await res.json();
      const extracted = responseData.data || responseData;

      // 1. Update Origin & Destination
      const newFrom = extracted.from ? extracted.from.toUpperCase() : origin;
      const newTo = extracted.to ? extracted.to.toUpperCase() : destination;

      setOrigin(newFrom);
      setDestination(newTo);

      // 2. Fetch LIVE Real Flights from API Route
      const [outRes, retRes] = await Promise.all([
        fetch(`/api/flights?from=${newFrom}&to=${newTo}`).then((r) => r.json()),
        fetch(`/api/flights?from=${newTo}&to=${newFrom}`).then((r) => r.json()),
      ]);

      const liveOutbound = outRes.flights || [];
      const liveReturn = retRes.flights || [];

      setOutboundCatalog(liveOutbound);
      setReturnCatalog(liveReturn);
      setSelectedOutbound(liveOutbound[0] || null);
      setSelectedReturn(liveReturn[0] || null);
      // 3. Handle passenger count
      if (extracted.passengers && Number(extracted.passengers) > 0) {
        const count = Number(extracted.passengers);
        const newPassList: Passenger[] = [];
        for (let i = 0; i < count; i++) {
          newPassList.push(passengers[i] || { name: '', age: '', outboundSeat: '', returnSeat: '' });
        }
        setPassengers(newPassList);
      }

      // 4. Handle round trip auto-toggle if mentioned
      if (text.toLowerCase().includes('round') || text.toLowerCase().includes('return')) {
        setTripType('round-trip');
      }
    } catch (e) {
      console.error('AI Search error:', e);
    } finally {
      setIsSearchingAI(false);
    }
  };

  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition not supported.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      handleAISearch(transcript);
    };
    recognition.start();
  };

  const downloadTicketPDF = (pnr: string, paymentId: string, outbound: Flight, ret: Flight | undefined, passList: Passenger[], totalAmount: number) => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('AIFlights Official E-Ticket', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Issued On: ' + new Date().toLocaleString(), 20, 32);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('PNR: ' + pnr, 20, 45);
    doc.text('Payment ID: ' + paymentId, 20, 53);
    doc.text('Outbound: ' + outbound.airline + ' (' + outbound.flightNo + ') ' + outbound.from + ' -> ' + outbound.to + ' (' + outbound.dep + ')', 20, 61);

    let y = 69;
    if (ret) {
      doc.text('Return: ' + ret.airline + ' (' + ret.flightNo + ') ' + ret.from + ' -> ' + ret.to + ' (' + ret.dep + ')', 20, y);
      y += 8;
    }

    doc.text('Total Paid: Rs. ' + totalAmount.toLocaleString('en-IN'), 20, y);
    y += 8;

    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Passenger Details & Seats:', 20, y);
    doc.setFont('helvetica', 'normal');
    y += 8;

    passList.forEach((p, idx) => {
      const seats = ret ? `Outbound: ${p.outboundSeat || '-'} | Return: ${p.returnSeat || '-'}` : `Seat: ${p.outboundSeat || '-'}`;
      doc.text(`${idx + 1}. ${p.name || 'Passenger'} (Age: ${p.age || 'N/A'}) - [${seats}]`, 25, y);
      y += 8;
    });

    doc.line(20, y + 2, 190, y + 2);
    doc.setFontSize(10);
    doc.setTextColor(50, 150, 50);
    doc.text('Status: Confirmed & Saved in Database', 20, y + 12);

    doc.save('Ticket_' + outbound.flightNo + '_' + pnr + '.pdf');
  };

  const handleCheckout = async () => {
    if (!passengers[0]?.name.trim()) {
      alert('Please enter at least one passenger name.');
      return;
    }
    const activeOutbound = selectedOutbound || outboundCatalog[0];
    const activeReturn = tripType === 'round-trip' ? (selectedReturn || returnCatalog[0]) : undefined;

    const baseFare = activeOutbound.numericPrice + (activeReturn ? activeReturn.numericPrice : 0);
    const totalAmount = baseFare * passengers.length;

    setIsBooking(true);
    try {
      const res = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount }),
      });
      const order = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: order.amount,
        currency: 'INR',
        name: 'AIFlights Booking',
        description: `${activeOutbound.flightNo} ${activeReturn ? '+ ' + activeReturn.flightNo : ''}`,
        order_id: order.id,
        handler: async function (response: any) {
          const pnr = `PNR-${response.razorpay_payment_id.slice(-8).toUpperCase()}`;

          const newBooking: BookingRecord = {
            pnr,
            paymentId: response.razorpay_payment_id,
            tripType,
            outboundFlight: activeOutbound,
            returnFlight: activeReturn,
            passengers: [...passengers],
            totalAmount,
            date: new Date().toLocaleDateString(),
          };

          await saveBookingToDBAndLocal(newBooking);
          downloadTicketPDF(pnr, response.razorpay_payment_id, activeOutbound, activeReturn, passengers, totalAmount);

          fetch('/api/send-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toEmail: contactEmail,
              bookingDetails: {
                pnr,
                flightNo: activeOutbound.flightNo,
                airline: activeOutbound.airline,
                from: activeOutbound.from,
                to: activeOutbound.to,
                dep: activeOutbound.dep,
                arr: activeOutbound.arr,
                totalAmount,
                passengers,
              },
            }),
          }).catch(() => {});

          alert('🎉 Payment Successful! Ticket confirmed & stored in database.');
        },
        prefill: { name: passengers[0].name, email: contactEmail, contact: contactPhone },
        theme: { color: '#2563EB' },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (e) {
      alert('Checkout failed');
    } finally {
      setIsBooking(false);
    }
  };

  const processedOutbound = processFlightList(outboundCatalog);
  const processedReturn = processFlightList(returnCatalog);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      {/* Navbar */}
      <nav className="p-5 bg-white shadow-sm flex justify-between items-center border-b">
        <h1 className="text-2xl font-black tracking-tight text-blue-600 cursor-pointer">
          ✈️ AIFlights
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm font-semibold px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            📋 My Bookings ({history.length})
          </button>
          <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            MongoDB Sync Active
          </span>
        </div>
      </nav>

      {/* Bookings Modal */}
      {showHistory && (
        <div className="max-w-4xl mx-auto px-4 mt-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Database Booking Records</h3>
              <button onClick={() => setShowHistory(false)} className="text-sm text-gray-500 font-bold">✕ Close</button>
            </div>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No records stored yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border flex justify-between items-center">
                    <div>
                      <span className="font-bold text-blue-600 text-sm">{h.pnr}</span>
                      <p className="font-semibold text-gray-800 text-sm">
                        {h.outboundFlight.airline} ({h.outboundFlight.from} ➔ {h.outboundFlight.to})
                        {h.returnFlight && ` + Return (${h.returnFlight.from} ➔ ${h.returnFlight.to})`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {h.passengers.length} Passenger(s) • Total: ₹{h.totalAmount.toLocaleString('en-IN')} • {h.date}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadTicketPDF(h.pnr, h.paymentId, h.outboundFlight, h.returnFlight, h.passengers, h.totalAmount)}
                      className="text-xs bg-blue-600 text-white font-bold px-3 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Download PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seat Selector Modal */}
      {seatModalType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 capitalize">Select {seatModalType} Seats</h3>
              <button onClick={() => setSeatModalType(null)} className="text-gray-500 font-bold">✕</button>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {passengers.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePassengerSeatIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activePassengerSeatIndex === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {p.name || `P${idx + 1}`}: {seatModalType === 'outbound' ? (p.outboundSeat || '-') : (p.returnSeat || '-')}
                </button>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border space-y-3">
              <div className="text-center text-xs text-gray-400 font-bold uppercase mb-2">Front (Cockpit)</div>
              {ALL_SEATS.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-2 items-center">
                  <span className="text-xs font-mono text-gray-400 w-4">{rIdx + 1}</span>
                  <div className="flex gap-1">
                    {row.slice(0, 3).map((seat) => {
                      const isSelected =
                        seatModalType === 'outbound'
                          ? passengers[activePassengerSeatIndex]?.outboundSeat === seat
                          : passengers[activePassengerSeatIndex]?.returnSeat === seat;
                      return (
                        <button
                          key={seat}
                          onClick={() => handleSeatSelect(seat)}
                          className={`w-9 h-9 rounded-lg text-xs font-bold ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-white border hover:border-blue-500'
                          }`}
                        >
                          {seat}
                        </button>
                      );
                    })}
                  </div>
                  <div className="w-3" />
                  <div className="flex gap-1">
                    {row.slice(3, 6).map((seat) => {
                      const isSelected =
                        seatModalType === 'outbound'
                          ? passengers[activePassengerSeatIndex]?.outboundSeat === seat
                          : passengers[activePassengerSeatIndex]?.returnSeat === seat;
                      return (
                        <button
                          key={seat}
                          onClick={() => handleSeatSelect(seat)}
                          className={`w-9 h-9 rounded-lg text-xs font-bold ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-white border hover:border-blue-500'
                          }`}
                        >
                          {seat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSeatModalType(null)}
              className="mt-5 w-full py-3 bg-blue-600 text-white font-bold rounded-xl"
            >
              Confirm Seats
            </button>
          </div>
        </div>
      )}

      {/* Hero & Trip Toggle */}
      <section className="mt-8 flex flex-col items-center px-4">
        <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
          <button
            onClick={() => {
              setTripType('one-way');
              setSelectedReturn(null);
            }}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition ${tripType === 'one-way' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
          >
            One-Way
          </button>
          <button
            onClick={() => setTripType('round-trip')}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition ${tripType === 'round-trip' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
          >
            Round-Trip (Return)
          </button>
        </div>

        <div className="w-full max-w-2xl relative flex items-center mb-6 gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
            placeholder="e.g., 'Flight to Mumbai for 2 people round trip'"
            className="w-full py-3.5 pl-4 pr-32 rounded-2xl border-2 border-gray-200 focus:border-blue-500 outline-none text-sm"
          />
          <button
            onClick={toggleVoiceSearch}
            className={`absolute right-24 p-2 rounded-xl text-xs font-semibold ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700'}`}
          >
            {isListening ? '🎙️...' : '🎤 Speak'}
          </button>
          <button
            onClick={() => handleAISearch()}
            disabled={isSearchingAI}
            className="absolute right-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
          >
            {isSearchingAI ? 'AI...' : 'Search'}
          </button>
        </div>

        {/* Filter Bar */}
        <div className="w-full max-w-4xl bg-white p-4 rounded-2xl border flex flex-wrap justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Filter Airline:</span>
            <select value={airlineFilter} onChange={(e) => setAirlineFilter(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50">
              <option value="ALL">All Airlines</option>
              <option value="IndiGo">IndiGo</option>
              <option value="Air India">Air India</option>
              <option value="Vistara">Vistara</option>
              <option value="Akasa Air">Akasa Air</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Sort:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-xs border rounded-lg p-2 bg-gray-50">
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="duration">Fastest</option>
            </select>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Passenger Sidebar */}
        <div className="md:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-gray-200 h-fit">
          <h3 className="font-bold text-gray-900 text-lg mb-3">Trip & Passengers</h3>

          <div className="space-y-2 mb-4">
            <label className="text-xs font-semibold text-gray-500">Contact Email</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full p-2.5 text-sm border rounded-lg" />
            <label className="text-xs font-semibold text-gray-500">Contact Phone</label>
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full p-2.5 text-sm border rounded-lg" />
          </div>

          <hr className="my-3" />
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-gray-500">Passengers ({passengers.length})</label>
          </div>

          <div className="space-y-3">
            {passengers.map((passenger, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-xl border relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-600">Passenger {index + 1}</span>
                  {passengers.length > 1 && (
                    <button onClick={() => removePassenger(index)} className="text-xs text-red-500 font-semibold">Delete</button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={passenger.name}
                  onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                  className="w-full p-2 text-sm border rounded mb-2 bg-white"
                />
                <input
                  type="number"
                  placeholder="Age"
                  value={passenger.age}
                  onChange={(e) => handlePassengerChange(index, 'age', e.target.value)}
                  className="w-full p-2 text-sm border rounded mb-2 bg-white"
                />
                <div className="text-xs text-blue-600 font-bold">
                  Outbound Seat: {passenger.outboundSeat || 'None'}
                  {tripType === 'round-trip' && ` | Return Seat: ${passenger.returnSeat || 'None'}`}
                </div>
              </div>
            ))}
          </div>

          <button onClick={addPassenger} className="mt-3 w-full py-2 bg-blue-50 text-blue-600 font-bold text-sm rounded-xl">
            + Add Another Passenger
          </button>

          <hr className="my-4" />
          <div className="space-y-2">
            <button
              onClick={() => setSeatModalType('outbound')}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
            >
              💺 Pick Outbound Seats
            </button>
            {tripType === 'round-trip' && (
              <button
                onClick={() => setSeatModalType('return')}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
              >
                💺 Pick Return Seats
              </button>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={isBooking}
            className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition"
          >
            {isBooking ? 'Processing...' : 'Proceed to Checkout'}
          </button>
        </div>

        {/* Flight Selection Column */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">
              1. Select Outbound Flight ({origin} ➔ {destination})
            </h3>
            <div className="space-y-3">
              {processedOutbound.map((flight) => {
                const isSelected = selectedOutbound?.id === flight.id || (!selectedOutbound && flight.id === outboundCatalog[0]?.id);
                return (
                  <div
                    key={flight.id}
                    onClick={() => setSelectedOutbound(flight)}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex justify-between items-center ${
                      isSelected ? 'border-blue-600 bg-blue-50/40 shadow-sm' : 'bg-white hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-gray-900">{flight.airline} ({flight.flightNo})</span>
                      <div className="text-xs text-gray-500 mt-1">{flight.dep} - {flight.arr} • {flight.duration}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="font-black text-gray-900 text-base">
                        ₹{flight.numericPrice.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOutbound(flight);
                          handleCheckout();
                        }}
                        disabled={isBooking}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {tripType === 'round-trip' && (
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">
                2. Select Return Flight ({destination} ➔ {origin})
              </h3>
              <div className="space-y-3">
                {processedReturn.map((flight) => {
                  const isSelected = selectedReturn?.id === flight.id || (!selectedReturn && flight.id === returnCatalog[0]?.id);
                  return (
                    <div
                      key={flight.id}
                      onClick={() => setSelectedReturn(flight)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex justify-between items-center ${
                        isSelected ? 'border-blue-600 bg-blue-50/40 shadow-sm' : 'bg-white hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-gray-900">{flight.airline} ({flight.flightNo})</span>
                        <div className="text-xs text-gray-500 mt-1">{flight.dep} - {flight.arr} • {flight.duration}</div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="font-black text-gray-900 text-base">
                          ₹{flight.numericPrice.toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReturn(flight);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}