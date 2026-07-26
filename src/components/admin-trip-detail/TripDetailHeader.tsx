/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trip } from '../../types.js';
import { ArrowLeft, Pencil, Copy, Check, Printer, Trash2, MoreVertical } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon.js';

interface TripDetailHeaderProps {
  trip: Trip;
  onBack: () => void;
  onEditClick: () => void;
  copied: boolean;
  onCopyLink: () => void;
  onTriggerPrint: () => void;
  onDelete: () => void;
}

export const TripDetailHeader: React.FC<TripDetailHeaderProps> = ({
  trip,
  onBack,
  onEditClick,
  copied,
  onCopyLink,
  onTriggerPrint,
  onDelete
}) => {
  // WhatsApp share message: trip details, pricing, and quick booking steps, in English and Hindi.
  // Note: no emoji here — WhatsApp Desktop's wa.me link handler is known to mangle
  // surrogate-pair (astral) emoji characters into replacement boxes; plain-text bullets avoid that.
  const publicBookingUrl = `${window.location.origin}/trip/${trip.public_share_token}`;
  const formattedTripDate = new Date(trip.trip_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const whatsappShareMessage = `*${trip.title}*
- Date: ${formattedTripDate}
- Seat Price: ₹${trip.seat_price.toLocaleString('en-IN')} per seat
- Advance to Book: ₹${trip.advance_per_seat.toLocaleString('en-IN')} per seat

*How to Book:*
1. Open the link below
2. Select your seat(s) on the chart
3. Enter your name & mobile number
4. Pay the advance via the UPI/QR shown and upload the payment screenshot
5. Submit — your seat is reserved!

Link: ${publicBookingUrl}

--------------------------------

*${trip.title}*
- दिनांक: ${formattedTripDate}
- सीट की कीमत: ₹${trip.seat_price.toLocaleString('en-IN')} प्रति सीट
- बुकिंग हेतु एडवांस: ₹${trip.advance_per_seat.toLocaleString('en-IN')} प्रति सीट

*सीट कैसे बुक करें:*
1. नीचे दिया गया लिंक खोलें
2. चार्ट में अपनी पसंद की सीट चुनें
3. अपना नाम और मोबाइल नंबर दर्ज करें
4. दिखाए गए UPI/QR से एडवांस भुगतान करें और भुगतान का स्क्रीनशॉट अपलोड करें
5. सबमिट करें — आपकी सीट आरक्षित हो जाएगी!

लिंक: ${publicBookingUrl}`;

  // Mobile action sheet: sheetOpen keeps it mounted, sheetVisible drives the slide/fade transition
  // (mount at the hidden position first, then flip to visible next frame so the transition plays).
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    if (sheetOpen) {
      requestAnimationFrame(() => setSheetVisible(true));
    }
  }, [sheetOpen]);

  const openSheet = () => setSheetOpen(true);
  const closeSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSheetOpen(false), 300);
  };

  return (
    <div className="flex items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onBack}
          className="w-10 h-10 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center text-slate-700 hover:text-slate-900 bg-white shadow-xs transition-all cursor-pointer shrink-0"
          title="Return to list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Active Trip Operations</span>
          <h2 className="text-2xl sm:text-2xl font-black uppercase text-slate-800 tracking-tight truncate max-w-md">
            {trip.title}
          </h2>
        </div>
      </div>

      {/* Mobile: single "more actions" trigger */}
      <button
        onClick={openSheet}
        className="sm:hidden w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 bg-white shadow-xs cursor-pointer shrink-0"
        title="Trip actions"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Desktop: full button row */}
      <div className="hidden sm:flex sm:flex-wrap sm:items-center gap-2">
        {/* Edit Trip Details */}
        <button
          onClick={onEditClick}
          className="px-4 py-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-slate-700 font-bold uppercase text-xs tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Pencil className="w-4 h-4" />
          <span>Edit Trip</span>
        </button>

        {/* Copy Shareable Link */}
        <button
          onClick={onCopyLink}
          className="px-4 py-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-slate-700 font-bold uppercase text-xs tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Share link</span>
            </>
          )}
        </button>

        {/* Share on WhatsApp */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(whatsappShareMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Share booking link on WhatsApp"
          className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-400 text-emerald-700 font-bold uppercase text-xs tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <WhatsAppIcon className="w-4 h-4 fill-current" />
          <span>Share</span>
        </a>

        {/* Print Manifest */}
        <button
          onClick={onTriggerPrint}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Export Printable Manifest</span>
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        {/* Delete Trip */}
        <button
          onClick={onDelete}
          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 font-bold uppercase text-xs tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Trip</span>
        </button>
      </div>

      {/* Mobile action sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <div
            className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-300 ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeSheet}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-1 transition-transform duration-300 ease-out ${
              sheetVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2"></div>
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-dashed border-slate-200">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">Trip Actions</span>
              <button
                onClick={closeSheet}
                className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <button
              onClick={() => { onEditClick(); closeSheet(); }}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-700" />
              <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Edit Trip</span>
            </button>

            <button
              onClick={() => { onCopyLink(); closeSheet(); }}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer"
            >
              <Copy className="w-4 h-4 text-slate-700" />
              <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Copy Share Link</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappShareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeSheet}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 fill-current text-emerald-700" />
              <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Share on WhatsApp</span>
            </a>

            <button
              onClick={() => { onTriggerPrint(); closeSheet(); }}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Export Printable Manifest</span>
            </button>

            <button
              onClick={() => { onDelete(); closeSheet(); }}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-red-50 text-left cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span className="text-sm font-bold uppercase tracking-wide text-red-600">Delete Trip</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
