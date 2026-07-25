/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Trip, TripSeat, Booking, BookingSeat, CompanySettings } from '../types.js';
import { ManifestHeader } from './trip-manifest-print/ManifestHeader.js';
import { ManifestFooter } from './trip-manifest-print/ManifestFooter.js';
import { DeckChart } from './trip-manifest-print/DeckChart.js';
import { PassengerTable, PassengerTableFontSize } from './trip-manifest-print/PassengerTable.js';
import { CardDownloadMenu } from './trip-manifest-print/CardDownloadMenu.js';

export type { PassengerTableFontSize };

interface TripManifestPrintProps {
  trip: Trip;
  seats: TripSeat[];
  bookings: (Booking & { seat_codes: string[]; seats_details: BookingSeat[] })[];
  company: CompanySettings;
  // How many passenger rows to fit on one page before spilling onto the next.
  rowsPerPage?: number;
  // Font size for the Boarding Passengers List table.
  passengerTableFontSize?: PassengerTableFontSize;
  // Column headers always stay put — these only hide/show the values underneath.
  showMobile?: boolean;
  showPrice?: boolean;
  showOutstanding?: boolean;
  showTotalPaid?: boolean;
  showPayment?: boolean;
  showDisabledSeats?: boolean;
}

export const TripManifestPrint: React.FC<TripManifestPrintProps> = ({
  trip,
  seats,
  bookings,
  company,
  rowsPerPage = 20,
  passengerTableFontSize = 'medium',
  showMobile = true,
  showPrice = true,
  showOutstanding = true,
  showTotalPaid = true,
  showPayment = true,
  showDisabledSeats = true
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

  // Group seats
  const lowerSeats = seats.filter(s => s.deck === 'lower');
  const upperSeats = seats.filter(s => s.deck === 'upper');
  const mainSeats = seats.filter(s => s.deck === 'main');

  // Passenger list rows are chunked across as many pages as needed instead of
  // overflowing a single fixed-height card. rowsPerPage is caller-configurable
  // (see PrintPreviewOverlay's "Rows per page" control) since the right number
  // of rows-per-page depends on data/font rendering the caller can eyeball.
  const activeBookings = bookings.filter(b => b.status === 'confirmed');
  const passengerChunks = activeBookings.length === 0
    ? [[]]
    : Array.from(
        { length: Math.ceil(activeBookings.length / rowsPerPage) },
        (_, i) => activeBookings.slice(i * rowsPerPage, (i + 1) * rowsPerPage)
      );

  const passengerPages = passengerChunks.map((chunk, i) => ({
    heading: passengerChunks.length > 1
      ? `Boarding Passengers List (Page ${i + 1} of ${passengerChunks.length})`
      : 'Boarding Passengers List',
    content: (
      <PassengerTable
        trip={trip}
        bookings={chunk}
        startIndex={i * rowsPerPage}
        fontSize={passengerTableFontSize}
        showMobile={showMobile}
        showPrice={showPrice}
        showOutstanding={showOutstanding}
        showTotalPaid={showTotalPaid}
        showPayment={showPayment}
      />
    ),
    narrow: false,
    fileLabel: passengerChunks.length > 1 ? `Passenger_List_${i + 1}` : 'Passenger_List'
  }));

  // Every "page" here is a fully self-contained card: its own header, its own
  // section content, and its own footer — one deck per card, list starts on
  // the card right after the last deck, and the list spills onto extra pages.
  const pages = [
    ...(isSleeper
      ? [
          { heading: 'Bus Seat Layout Matrix — Lower Deck', content: <DeckChart deckSeats={lowerSeats} label="LOWER" showDisabledSeats={showDisabledSeats} />, narrow: true, fileLabel: 'Lower_Deck' },
          { heading: 'Bus Seat Layout Matrix — Upper Deck', content: <DeckChart deckSeats={upperSeats} label="UPPER" showDisabledSeats={showDisabledSeats} />, narrow: true, fileLabel: 'Upper_Deck' }
        ]
      : [{ heading: 'Bus Seat Layout Matrix', content: <DeckChart deckSeats={mainSeats} label="MAIN" />, narrow: true, fileLabel: 'Seat_Layout' }]),
    ...passengerPages
  ];

  return (
    <div className="space-y-8 print:space-y-0 overflow-auto" id="printable-manifest">
      {pages.map((page, idx) => (
        <div
          key={page.heading}
          ref={(el) => { cardRefs.current[idx] = el; }}
          className={`relative bg-white p-8 font-sans text-black w-[210mm] h-[297mm] print:h-[277mm] mx-auto rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:rounded-none print:mx-0 print:max-w-none flex flex-col ${
            idx < pages.length - 1 ? 'break-after-page' : ''
          }`}
        >
          <CardDownloadMenu
            downloading={downloadingIndex !== null}
            menuOpen={downloadMenuIndex === idx}
            onToggleMenu={() => setDownloadMenuIndex(downloadMenuIndex === idx ? null : idx)}
            onCloseMenu={() => setDownloadMenuIndex(null)}
            onDownloadPdf={() => handleDownloadPdf(idx, page.fileLabel)}
            onDownloadImage={() => handleDownloadImage(idx, page.fileLabel)}
          />

          <ManifestHeader trip={trip} company={company} />

          <div className="mt-6 flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-bold uppercase font-mono tracking-widest mb-3 border-b-2 border-black pb-1 shrink-0">
              {page.heading}
            </h3>
            <div className={`flex-1 flex flex-col min-h-0 ${page.narrow ? 'w-full mx-auto' : ''}`}>
              {page.content}
            </div>
          </div>

          <ManifestFooter />
        </div>
      ))}
    </div>
  );
};
