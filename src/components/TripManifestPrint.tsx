/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trip, TripSeat, Booking, CompanySettings } from '../types.js';

interface TripManifestPrintProps {
  trip: Trip;
  seats: TripSeat[];
  bookings: (Booking & { seat_codes: string[] })[];
  company: CompanySettings;
}

// Shrinks the passenger name inside a seat box as it gets longer, so long
// names stay fully visible (wrapped) instead of being cut off mid-word.
const getSeatNameSizeClass = (name: string) => {
  const len = name.trim().length;
  if (len <= 6) return 'text-[8px]';
  if (len <= 10) return 'text-[7px]';
  if (len <= 16) return 'text-[6px]';
  if (len <= 24) return 'text-[5px]';
  return 'text-[4.5px]';
};

export const TripManifestPrint: React.FC<TripManifestPrintProps> = ({
  trip,
  seats,
  bookings,
  company
}) => {
  const isSleeper = trip.bus_model.includes('sleeper');

  // Filter confirmed bookings
  const activeBookings = bookings.filter(b => b.status === 'confirmed');

  // Group seats
  const lowerSeats = seats.filter(s => s.deck === 'lower');
  const upperSeats = seats.filter(s => s.deck === 'upper');
  const mainSeats = seats.filter(s => s.deck === 'main');

  const getLayoutDimensions = (deckSeats: TripSeat[]) => {
    if (deckSeats.length === 0) return { rows: 0, cols: 0 };
    return {
      rows: Math.max(...deckSeats.map(s => s.row_num)),
      cols: Math.max(...deckSeats.map(s => s.col_num))
    };
  };

  const renderPrintDeck = (deckSeats: TripSeat[], label: string) => {
    const { rows, cols } = getLayoutDimensions(deckSeats);
    if (rows === 0) return null;

    const grid: (TripSeat | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols + 1 }, () => null)
    );

    deckSeats.forEach(seat => {
      if (seat.row_num <= rows && seat.col_num <= cols) {
        grid[seat.row_num - 1][seat.col_num] = seat;
      }
    });

    return (
      <div className="border-2 border-black rounded-xl p-4">
        <h4 className="text-center font-bold border-b border-black pb-2 mb-3 text-xs uppercase font-mono bg-neutral-100">
          {label} DECK CHART
        </h4>
        <div className="space-y-1.5">
          {grid.map((row, rIdx) => (
            <div
              key={rIdx}
              className="grid gap-1 break-inside-avoid"
              // Explicit equal-width columns (minmax(0, 1fr)) so every seat box
              // stays the same size regardless of how long a passenger name is.
              style={{ gridTemplateColumns: `repeat(${cols + 1}, minmax(0, 1fr))` }}
            >
              {row.map((seat, cIdx) => {
                if (!seat) {
                  return <div key={cIdx} className="min-h-14"></div>;
                }

                const isBooked = seat.status === 'booked';
                const isDisabled = seat.status === 'disabled';
                const name = seat.customer_name || '';

                return (
                  <div
                    key={seat.id}
                    className={`min-w-0 min-h-14 border border-black rounded flex flex-col items-stretch overflow-hidden ${
                      isBooked
                        ? 'bg-neutral-50 text-black'
                        : isDisabled
                        ? 'bg-neutral-200 text-neutral-400 font-serif line-through'
                        : 'bg-white text-neutral-800'
                    }`}
                  >
                    <div className="bg-amber-400 font-bold px-1 py-0.5 text-center text-black border-b border-black font-mono text-[9px] shrink-0">
                      {seat.seat_code}
                    </div>
                    <div
                      className={`p-1 flex-1 min-h-0 flex items-center justify-center text-center font-extrabold uppercase wrap-break-word leading-none line-clamp-2 ${
                        isBooked && name ? getSeatNameSizeClass(name) : 'text-[9px]'
                      }`}
                    >
                      {isBooked ? (name || 'BOOKED') : isDisabled ? 'BLOCKED' : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHeader = () => (
    <div className="print:px-[10mm] print:pt-[6mm]">
      {/* Mantra Line */}
      {company.tagline && (
        <div className="text-center text-xs font-serif font-semibold text-neutral-700 tracking-widest mb-1">
          {company.tagline}
        </div>
      )}

      <div className="border-2 border-black p-3 rounded-xl flex flex-col items-center justify-center relative">
        <div className="absolute top-2 left-4 text-[10px] font-mono font-bold border border-black px-2 py-0.5 rounded bg-amber-400">
          OFFICIAL MANIFEST
        </div>
        <div className="text-2xl font-black uppercase tracking-wider text-slate-950 mt-2">
          {company.company_name || 'JAIN TOURS & TRAVEL'}
        </div>
        <div className="text-xs font-medium text-neutral-600 mt-1 uppercase tracking-widest font-mono">
          Bus Boarding & Seat Layout Chart
        </div>

        {/* Dotted border line */}
        <div className="w-full border-t border-dashed border-black my-2"></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-xs font-mono">
          <div>
            <strong>TRIP:</strong> <span className="uppercase">{trip.title}</span>
          </div>
          <div>
            <strong>DATE:</strong> {new Date(trip.trip_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
          <div>
            <strong>BUS TYPE:</strong> <span className="uppercase">{trip.bus_model.replace('_', ' ')}</span>
          </div>
          <div>
            <strong>CAPACITY:</strong> {trip.total_seats} SEATS
          </div>
        </div>
      </div>
    </div>
  );

  const renderFooter = () => (
    <div className="print:px-[10mm] print:pb-[6mm]">
      <div className="grid grid-cols-2 gap-8 text-xs font-mono border-t border-black pt-2">
        <div>
          <p><strong>Conductor Signature:</strong> ________________________</p>
          <p className="text-[10px] text-neutral-500 mt-1">Verify passenger identity and advance payment slip upon boarding.</p>
        </div>
        <div className="text-right">
          <p><strong>Report Generated:</strong> {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN')}</p>
          <p className="text-[10px] text-neutral-500 mt-1">Bus Seat Reservation Applet • Jain Tours & Travel</p>
        </div>
      </div>
    </div>
  );

  // Each deck always starts on its own fresh printed page; the passenger
  // list follows immediately after the last deck page.
  const deckSections = isSleeper
    ? [
        { seats: lowerSeats, label: 'LOWER' },
        { seats: upperSeats, label: 'UPPER' }
      ]
    : [{ seats: mainSeats, label: 'MAIN' }];

  return (
    <div className="bg-white font-sans text-black" id="printable-manifest">
      {/* Header: normal flow on screen, fixed & repeating on every printed A4 page */}
      <div className="print:fixed print:top-0 print:left-0 print:right-0 print:bg-white">
        {renderHeader()}
      </div>

      {/* Main flowing content: page-broken into deck chart pages + passenger list pages */}
      <div className="p-8 print:p-0 print:px-[10mm] space-y-6 print:space-y-0">
        {deckSections.map((section) => (
          <div key={section.label} className="break-after-page">
            <h3 className="text-sm font-bold uppercase font-mono tracking-widest mb-3 border-b-2 border-black pb-1">
              1. Bus Seat Layout Matrix — {section.label} Deck
            </h3>
            <div className="max-w-2xl mx-auto">
              {renderPrintDeck(section.seats, section.label)}
            </div>
          </div>
        ))}

        {/* Passengers Table List — always starts on the page right after the deck charts */}
        <div className="break-before-page">
          <h3 className="text-sm font-bold uppercase font-mono tracking-widest mb-3 border-b-2 border-black pb-1">
            2. Boarding Passengers List
          </h3>
          <table className="w-full text-[11px] text-left border-collapse border border-black font-mono">
            <thead>
              <tr className="bg-neutral-100 uppercase border-b border-black">
                <th className="border-r border-black p-2 w-10 text-center">S.No</th>
                <th className="border-r border-black p-2 w-20">Seats</th>
                <th className="border-r border-black p-2">Passenger Name</th>
                <th className="border-r border-black p-2 w-32">Mobile Number</th>
                <th className="border-r border-black p-2 w-24 text-right">Advance Paid</th>
                <th className="border-r border-black p-2 w-24 text-center">Payment</th>
                <th className="p-2 w-24 text-center">Sign</th>
              </tr>
            </thead>
            <tbody>
              {activeBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-neutral-500 italic">
                    No confirmed bookings found on this trip.
                  </td>
                </tr>
              ) : (
                activeBookings.map((booking, idx) => (
                  <tr key={booking.id} className="border-b border-black hover:bg-neutral-50 break-inside-avoid">
                    <td className="border-r border-black p-2 text-center">{idx + 1}</td>
                    <td className="border-r border-black p-2 font-bold text-amber-600">
                      {booking.seat_codes.join(', ')}
                    </td>
                    <td className="border-r border-black p-2 font-extrabold uppercase">
                      {booking.customer_name}
                    </td>
                    <td className="border-r border-black p-2">
                      {booking.mobile_number || 'N/A'}
                    </td>
                    <td className="border-r border-black p-2 text-right font-bold text-emerald-800">
                      ₹{booking.advance_amount_total.toLocaleString('en-IN')}
                    </td>
                    <td className="border-r border-black p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] border font-bold uppercase ${
                        booking.payment_verified
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                          : 'bg-red-100 border-red-300 text-red-950'
                      }`}>
                        {booking.payment_verified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="p-2 border-b border-black"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: normal flow on screen, fixed & repeating on every printed A4 page */}
      <div className="print:fixed print:bottom-0 print:left-0 print:right-0 print:bg-white">
        {renderFooter()}
      </div>
    </div>
  );
};
