/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trip, TripSeat, CompanySettings } from '../types.js';
import { fetchPublicTrip, bookPublicTrip } from '../lib/api.js';
import { BusSeatChart } from './BusSeatChart.js';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  FileImage,
  QrCode,
  ArrowRight,
  Bus
} from 'lucide-react';

interface PublicBookingProps {
  shareToken: string;
}

export const PublicBooking: React.FC<PublicBookingProps> = ({ shareToken }) => {
  const [tripData, setTripData] = useState<{ trip: Trip; seats: TripSeat[]; company: CompanySettings } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seat Selection State
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Booking Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null);

  useEffect(() => {
    loadTrip();
  }, [shareToken]);

  const loadTrip = async () => {
    try {
      const data = await fetchPublicTrip(shareToken);
      setTripData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'The booking link you followed is invalid or has been archived.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat: TripSeat) => {
    if (seat.status !== 'available') return;

    setSelectedSeats(prev => {
      if (prev.includes(seat.seat_code)) {
        return prev.filter(c => c !== seat.seat_code);
      } else {
        return [...prev, seat.seat_code];
      }
    });
  };

  // Convert uploaded image to Base64 for database screenshot saving
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File is too large. Maximum size is 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripData || selectedSeats.length === 0 || !name.trim()) return;

    setSubmitting(true);
    setConcurrencyError(null);

    try {
      const booking = await bookPublicTrip(shareToken, {
        customerName: name,
        mobileNumber: phone,
        message,
        paymentScreenshotUrl: screenshotBase64,
        seatCodes: selectedSeats
      });

      setBookingSuccess(booking);
      setSelectedSeats([]);
      setName('');
      setPhone('');
      setMessage('');
      setScreenshotBase64(null);
      
      // Reload trip layout to reflect newly booked seats
      loadTrip();
    } catch (err: any) {
      // Catch concurrent booking conflict (409 Conflict)
      setConcurrencyError(err.message || 'Seat reservation conflict occurred.');
      loadTrip(); // Reload fresh seat status instantly
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Loading Seat Chart...</p>
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500"></div>
          <AlertTriangle className="w-14 h-14 text-red-500 mx-auto animate-pulse" />
          <h3 className="text-xl font-black text-slate-800 uppercase">Invalid Share Link</h3>
          <p className="text-xs font-semibold text-slate-500 leading-relaxed uppercase tracking-wide">
            {error || 'This travel chart is no longer active or could not be found. Please check with your travel agency / tour operator.'}
          </p>
        </div>
      </div>
    );
  }

  const { trip, seats, company } = tripData;

  const totalAdvanceRequired = selectedSeats.length * trip.advance_per_seat;
  const totalFullPrice = selectedSeats.length * trip.seat_price;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-stretch">
      {/* Visual Header Image backdrop if configured */}
      <div
        className="h-44 sm:h-52 bg-slate-900 relative flex items-center justify-center text-center overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: company.header_image_url ? `url(${company.header_image_url})` : 'none'
        }}
      >
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"></div>

        <div className="relative z-10 space-y-2 p-4 text-white">
          {company.tagline && (
            <p className="text-[10px] sm:text-xs font-serif font-black text-amber-400 tracking-widest uppercase">
              {company.tagline}
            </p>
          )}
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-wide leading-none text-white drop-shadow">
            {company.company_name || 'JAIN TOURS & TRAVEL'}
          </h1>
          <p className="text-[10px] sm:text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
            Departure Seat Reservation Portal
          </p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Bus Seats Map */}
        <div className="lg:col-span-7 space-y-6">
          {/* Trip Summary Details Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider">Active Booking Service</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-800 leading-snug tracking-tight">
              {trip.title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-mono font-bold text-slate-500 border-t border-dashed border-slate-100">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Date: {new Date(trip.trip_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-slate-400" />
                <span className="uppercase">Layout: {trip.bus_model.replace('_', ' ')}</span>
              </div>
            </div>

            {trip.description && (
              <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl text-xs text-slate-600 font-medium leading-relaxed uppercase tracking-wider">
                {trip.description}
              </div>
            )}
          </div>

          {/* Interactive Chart layout */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-dashed border-slate-200 pb-3">
              <h3 className="text-md font-black uppercase text-slate-850">Select Your Seats</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Click available white seat tiles below to hold seats. Multi-select supported.</p>
            </div>

            <BusSeatChart
              seats={seats}
              busModel={trip.bus_model}
              selectedSeats={selectedSeats}
              onSeatClick={handleSeatClick}
              isAdmin={false}
            />
          </div>
        </div>

        {/* Right Column: Checkout Pricing and Deposit Form */}
        <div className="lg:col-span-5 space-y-8">
          {/* Running Calculation Box */}
          {selectedSeats.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>

              <div>
                <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Secure Reservation</h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
                  Secure your seats by submitting the required deposit slip
                </p>
              </div>

              {/* Running Seats Selected List */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold font-mono text-slate-600 uppercase">
                  <span>Selected Seats ({selectedSeats.length})</span>
                  <span className="text-amber-600 font-black">{selectedSeats.join(', ')}</span>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-3 space-y-2">
                  {/* Full Tickets Calculation */}
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase font-mono">
                    <span>Full Ticket Price</span>
                    <span>₹{trip.seat_price} × {selectedSeats.length} = ₹{totalFullPrice.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Advance required (read-only for customers) */}
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-emerald-800">Required Advance (₹{trip.advance_per_seat}/seat)</span>
                    <span className="font-black text-emerald-900 text-sm">₹{totalAdvanceRequired.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed text-center uppercase tracking-wide">
                    Pay deposit now via UPI, and pay the remaining balance of ₹{(totalFullPrice - totalAdvanceRequired).toLocaleString('en-IN')} upon boarding.
                  </p>
                </div>
              </div>

              {/* Booking Checkout form */}
              <form onSubmit={handleSubmitBooking} className="space-y-5">
                {/* Passenger Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Full Name (Required)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter traveler full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                  />
                </div>

                {/* Mobile */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900 font-mono"
                  />
                </div>

                {/* Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Boarding Point / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Board from Sector 12 Metro Station"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                  />
                </div>

                {/* UPI QR Code scan instruction block */}
                <div className="space-y-3 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">Scan & Pay Deposit</span>
                  </div>

                  {trip.qr_code_url ? (
                    <div className="flex justify-center bg-white p-2 rounded-lg border border-slate-200 max-w-37.5 mx-auto shadow-xs">
                      <img
                        src={trip.qr_code_url}
                        alt="UPI Payment QR"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-white/20 rounded-lg text-center">
                      <div className="text-[10px] font-mono text-slate-300">UPI ID for Direct Transfers:</div>
                      <div className="font-bold text-sm text-amber-400 font-mono tracking-wide mt-1 select-all">jaintours@upi</div>
                      <div className="text-[9px] text-slate-400 mt-2 uppercase tracking-wider leading-relaxed">
                        Please pay ₹{totalAdvanceRequired.toLocaleString('en-IN')} deposit and submit the screenshot.
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider leading-relaxed">
                    Scan using PhonePe, GPay, Paytm, or BHIM. Attach screenshot proof below.
                  </p>
                </div>

                {/* Screenshot Upload with Drag-and-drop capability */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Upload Payment Screenshot Receipt
                  </label>
                  
                  <div className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center transition-all relative bg-slate-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    
                    {screenshotBase64 ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <FileImage className="w-8 h-8 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Receipt Attached Successfully!</span>
                        <img
                          src={screenshotBase64}
                          alt="Screenshot Proof Preview"
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 object-contain rounded border bg-white"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1 flex flex-col items-center text-slate-400">
                        <UploadCloud className="w-8 h-8 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Click or Drag Image here</span>
                        <span className="text-[9px] font-medium text-slate-400 block uppercase">Max file size 8MB (JPEG, PNG)</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-800 font-bold uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Secure Seat Reservation</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            // Empty State (No seat selected)
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-4 max-w-sm mx-auto">
              <Bus className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wide">No Seats Selected</h3>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed uppercase tracking-wider">
                Please click on one or more available white seats on the chart to begin your reservation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 3: CONCURRENCY CONFLICT ERROR DIALOG */}
      {concurrencyError && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden text-center">
            <div className="h-1.5 bg-red-500"></div>
            <div className="p-6 space-y-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
              <h3 className="text-lg font-black uppercase text-red-950 leading-none">Seat Selection Conflict</h3>
              <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase tracking-wider">
                {concurrencyError}
              </p>
              <button
                onClick={() => setConcurrencyError(null)}
                className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 font-bold uppercase text-xs tracking-wider rounded-xl shadow-sm cursor-pointer transition-all"
              >
                Choose other seats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BOOKING SUCCESS DIALOG */}
      {bookingSuccess && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden text-center">
            <div className="h-1.5 bg-emerald-500"></div>
            <div className="p-6 sm:p-8 space-y-6">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-pulse" />
              
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">Ticket Reservation Secure!</h3>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Thank you for booking with {company.company_name || 'Jain Tours & Travel'}
                </p>
              </div>

              {/* Receipt info block */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left text-xs font-mono font-bold space-y-2 text-slate-600 uppercase">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Passenger Name</span>
                  <span className="text-slate-950 font-black">{bookingSuccess.customer_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Secured Seats</span>
                  <span className="text-amber-600 font-black text-sm">{selectedSeats.join(', ')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Advance Paid Deposit</span>
                  <span className="text-emerald-800 font-black">₹{bookingSuccess.advance_amount_total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded text-[9px] border border-emerald-200">
                    Awaiting Verification
                  </span>
                </div>
              </div>

              <button
                onClick={() => setBookingSuccess(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl shadow-sm cursor-pointer transition-all"
              >
                Return to seat map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
