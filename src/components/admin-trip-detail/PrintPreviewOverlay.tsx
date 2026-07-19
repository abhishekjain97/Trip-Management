/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trip, TripSeat, Booking, BookingSeat, CompanySettings } from '../../types.js';
import { TripManifestPrint, PassengerTableFontSize } from '../TripManifestPrint.js';
import { ManifestSettingsPopover } from './ManifestSettingsPopover.js';

interface PrintPreviewOverlayProps {
  trip: Trip;
  seats: TripSeat[];
  bookings: (Booking & { seat_codes: string[]; seats_details: BookingSeat[] })[];
  company: CompanySettings;
  onClose: () => void;
}

export const PrintPreviewOverlay: React.FC<PrintPreviewOverlayProps> = ({ trip, seats, bookings, company, onClose }) => {
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [fontSize, setFontSize] = useState<PassengerTableFontSize>('medium');
  const [showMobile, setShowMobile] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showPayment, setShowPayment] = useState(true);
  const [showDisabledSeats, onShowDisabledSeatChange] = useState(true);

  return (
    <div className="fixed inset-0 bg-slate-100 z-50 overflow-y-auto print:bg-white print:p-0 h-screen">
      {/* Top Control Bar - Hidden during printing */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm z-50 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-black text-sm">
            📄
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Print & Export Preview</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Review manifest format before generation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ManifestSettingsPopover
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            showMobile={showMobile}
            onShowMobileChange={setShowMobile}
            showPrice={showPrice}
            onShowPriceChange={setShowPrice}
            showPayment={showPayment}
            onShowPaymentChange={setShowPayment}
            showDisabledSeats={showDisabledSeats}
            onShowDisabledSeatChange={onShowDisabledSeatChange}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200"
          >
            Close Preview
          </button>
        </div>
      </div>

      {/* Centered paper container mimicking real pages — each section renders its own card */}
      <div className="p-4 sm:p-8 print:p-0">
        <TripManifestPrint
          trip={trip}
          seats={seats}
          bookings={bookings}
          company={company}
          rowsPerPage={rowsPerPage}
          passengerTableFontSize={fontSize}
          showMobile={showMobile}
          showPrice={showPrice}
          showPayment={showPayment}
          showDisabledSeats={showDisabledSeats}
        />
      </div>
    </div>
  );
};
