/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trip, TripSeat, Booking, CompanySettings } from '../types.js';
import { fetchPublicTrip, bookPublicTrip } from '../lib/api.js';
import { BusSeatChart } from './BusSeatChart.js';
import { AlertTriangle, Bus } from 'lucide-react';
import { PublicBookingHeaderBanner } from './public-booking/PublicBookingHeaderBanner.js';
import { TripSummaryCard } from './public-booking/TripSummaryCard.js';
import { PaymentQrCard } from './public-booking/PaymentQrCard.js';
import { CheckoutPanel } from './public-booking/CheckoutPanel.js';
import { ConcurrencyErrorModal } from './public-booking/ConcurrencyErrorModal.js';
import { BookingSuccessModal } from './public-booking/BookingSuccessModal.js';

interface PublicBookingProps {
  shareToken: string;
}

export const PublicBooking: React.FC<PublicBookingProps> = ({ shareToken }) => {
  const [tripData, setTripData] = useState<{ trip: Trip; seats: TripSeat[]; company: CompanySettings } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seat Selection State
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);
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

    setSelectedSeats(prev =>
      prev.includes(seat.seat_code) ? prev.filter(c => c !== seat.seat_code) : [...prev, seat.seat_code]
    );
  };

  const handleSubmitBooking = async (formData: {
    customerName: string;
    mobileNumber: string;
    message: string;
    paymentScreenshotUrl: string | null;
  }) => {
    if (!tripData || selectedSeats.length === 0) return;

    setConcurrencyError(null);
    try {
      const booking = await bookPublicTrip(shareToken, {
        customerName: formData.customerName,
        mobileNumber: formData.mobileNumber,
        message: formData.message,
        paymentScreenshotUrl: formData.paymentScreenshotUrl,
        seatCodes: selectedSeats
      });

      setBookingSuccess(booking);
      setSelectedSeats([]);

      // Reload trip layout to reflect newly booked seats
      loadTrip();
    } catch (err: any) {
      // Catch concurrent booking conflict (409 Conflict)
      setConcurrencyError(err.message || 'Seat reservation conflict occurred.');
      loadTrip(); // Reload fresh seat status instantly
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-stretch">
      <PublicBookingHeaderBanner company={company} />

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Bus Seats Map */}
        <div className="lg:col-span-7 space-y-6">
          <TripSummaryCard trip={trip} />

          {/* Interactive Chart layout */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-dashed border-slate-200 pb-3">
              <h3 className="text-md font-black uppercase text-slate-850">Select Your Seats</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Click available white seat tiles below to hold seats. Multi-select supported.</p>
            </div>

            <div className="overflow-auto">
              <BusSeatChart
                seats={seats}
                busModel={trip.bus_model}
                selectedSeats={selectedSeats}
                onSeatClick={handleSeatClick}
                isAdmin={false}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Pricing and Deposit Form */}
        <div className="lg:col-span-5 space-y-6">
          <PaymentQrCard trip={trip} />

          {selectedSeats.length > 0 ? (
            <CheckoutPanel trip={trip} selectedSeats={selectedSeats} onSubmit={handleSubmitBooking} />
          ) : (
            // Empty State (No seat selected)
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-4 mx-auto">
              <Bus className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wide">No Seats Selected</h3>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed uppercase tracking-wider">
                Please click on one or more available white seats on the chart to begin your reservation.
              </p>
            </div>
          )}
        </div>
      </div>

      {concurrencyError && (
        <ConcurrencyErrorModal message={concurrencyError} onClose={() => setConcurrencyError(null)} />
      )}

      {bookingSuccess && (
        <BookingSuccessModal
          booking={bookingSuccess}
          companyName={company.company_name}
          selectedSeats={selectedSeats}
          onClose={() => setBookingSuccess(null)}
        />
      )}
    </div>
  );
};
