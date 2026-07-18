/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Trip, TripSeat, Booking, CompanySettings } from '../types.js';
import { Download, Loader2, FileText, FileImage } from 'lucide-react';

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
  if (len <= 6) return 'text-[22px]';
  if (len <= 10) return 'text-[21px]';
  if (len <= 16) return 'text-[19px]';
  if (len <= 24) return 'text-[17px]';
  return 'text-[15px]';
};

export const TripManifestPrint: React.FC<TripManifestPrintProps> = ({
  trip,
  seats,
  bookings,
  company
}) => {
  const isSleeper = trip.bus_model.includes('sleeper');

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadMenuIndex, setDownloadMenuIndex] = useState<number | null>(null);

  const captureCard = async (node: HTMLDivElement) => {
    const { default: html2canvas } = await import('html2canvas-pro');
    return html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      ignoreElements: (el) => el.classList.contains('manifest-no-capture')
    });
  };

  const buildFileName = (fileLabel: string, ext: string) => {
    const dateStr = trip.trip_date ? new Date(trip.trip_date).toISOString().slice(0, 10) : 'undated';
    const safeTitle = trip.title.trim().replace(/[^a-zA-Z0-9]+/g, '_') || 'Trip';
    return `${safeTitle}_${dateStr}_${fileLabel}.${ext}`;
  };

  const handleDownloadPdf = async (idx: number, fileLabel: string) => {
    const node = cardRefs.current[idx];
    if (!node || downloadingIndex !== null) return;

    setDownloadMenuIndex(null);
    setDownloadingIndex(idx);
    try {
      const [canvas, { jsPDF }] = await Promise.all([captureCard(node), import('jspdf')]);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save(buildFileName(fileLabel, 'pdf'));
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadImage = async (idx: number, fileLabel: string) => {
    const node = cardRefs.current[idx];
    if (!node || downloadingIndex !== null) return;

    setDownloadMenuIndex(null);
    setDownloadingIndex(idx);
    try {
      const canvas = await captureCard(node);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = buildFileName(fileLabel, 'png');
      link.click();
    } finally {
      setDownloadingIndex(null);
    }
  };

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
      <div className="border-2 border-black rounded-xl p-4 flex-1 flex flex-col">
        <h4 className="text-center font-bold border-b border-black pb-2 mb-3 text-xs uppercase font-mono bg-neutral-100 shrink-0">
          {label} DECK CHART
        </h4>
        <div className="flex-1 flex flex-col gap-1.5">
          {grid.map((row, rIdx) => (
            <div
              key={rIdx}
              className="grid gap-1 break-inside-avoid flex-1 auto-rows-fr"
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
                    <div className="bg-amber-400 font-bold px-1 py-0.5 text-center text-black border-b border-black font-mono text-[15px] shrink-0">
                      {seat.seat_code}
                    </div>
                    <div
                      className={`p-1 flex-1 min-h-0 flex items-center justify-center text-center font-bold uppercase wrap-break-word line-clamp-2 leading-5 ${
                        isBooked && name ? getSeatNameSizeClass(name) : 'text-[15px]'
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
    <>
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
    </>
  );

  const renderFooter = () => (
    <div className="grid grid-cols-2 gap-8 text-xs font-mono border-t border-black pt-2 mt-6">
      <div>
        <p><strong>Conductor Signature:</strong> ________________________</p>
        <p className="text-[10px] text-neutral-500 mt-1">Verify passenger identity and advance payment slip upon boarding.</p>
      </div>
      <div className="text-right">
        <p><strong>Report Generated:</strong> {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN')}</p>
        <p className="text-[10px] text-neutral-500 mt-1">Bus Seat Reservation Applet • Jain Tours & Travel</p>
      </div>
    </div>
  );

  const passengerTable = (
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
              <td className="border-r border-black p-2 text-sm">
                {booking.mobile_number || 'N/A'}
              </td>
              <td className="border-r border-black p-2 text-center font-bold text-emerald-800 text-sm">
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
  );

  // Every "page" here is a fully self-contained card: its own header, its own
  // section content, and its own footer — one deck per card, list starts on
  // the card right after the last deck.
  const pages = [
    ...(isSleeper
      ? [
          { heading: 'Bus Seat Layout Matrix — Lower Deck', content: renderPrintDeck(lowerSeats, 'LOWER'), narrow: true, fileLabel: 'Lower_Deck' },
          { heading: 'Bus Seat Layout Matrix — Upper Deck', content: renderPrintDeck(upperSeats, 'UPPER'), narrow: true, fileLabel: 'Upper_Deck' }
        ]
      : [{ heading: 'Bus Seat Layout Matrix', content: renderPrintDeck(mainSeats, 'MAIN'), narrow: true, fileLabel: 'Seat_Layout' }]),
    { heading: 'Boarding Passengers List', content: passengerTable, narrow: false, fileLabel: 'Passenger_List' }
  ];

  return (
    <div className="space-y-8 print:space-y-0" id="printable-manifest">
      {pages.map((page, idx) => (
        <div
          key={page.heading}
          ref={(el) => { cardRefs.current[idx] = el; }}
          className={`relative bg-white p-8 font-sans text-black w-[210mm] h-[297mm] print:h-[277mm] mx-auto rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:rounded-none print:mx-0 print:max-w-none flex flex-col ${
            idx < pages.length - 1 ? 'break-after-page' : ''
          }`}
        >
          {/* Per-card download: exports just this one card, no print dialog */}
          <div className="manifest-no-capture absolute top-4 right-4 print:hidden">
            <button
              onClick={() => setDownloadMenuIndex(downloadMenuIndex === idx ? null : idx)}
              disabled={downloadingIndex !== null}
              title="Download this card"
              className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-700 text-white flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingIndex === idx ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            {downloadMenuIndex === idx && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDownloadMenuIndex(null)} />
                <div className="absolute top-10 right-0 z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <button
                    onClick={() => handleDownloadPdf(idx, page.fileLabel)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    Download as PDF
                  </button>
                  <button
                    onClick={() => handleDownloadImage(idx, page.fileLabel)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer border-t border-slate-100"
                  >
                    <FileImage className="w-3.5 h-3.5 shrink-0" />
                    Download as Image
                  </button>
                </div>
              </>
            )}
          </div>

          {renderHeader()}

          <div className="mt-6 flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-bold uppercase font-mono tracking-widest mb-3 border-b-2 border-black pb-1 shrink-0">
              {page.heading}
            </h3>
            <div className={`flex-1 flex flex-col min-h-0 ${page.narrow ? 'w-full mx-auto' : ''}`}>
              {page.content}
            </div>
          </div>

          {renderFooter()}
        </div>
      ))}
    </div>
  );
};
