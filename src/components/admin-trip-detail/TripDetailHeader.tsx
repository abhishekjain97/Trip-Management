/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trip } from '../../types.js';
import { ArrowLeft, Pencil, Copy, Check, Printer } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon.js';

interface TripDetailHeaderProps {
  trip: Trip;
  onBack: () => void;
  onEditClick: () => void;
  copied: boolean;
  onCopyLink: () => void;
  onTriggerPrint: () => void;
}

export const TripDetailHeader: React.FC<TripDetailHeaderProps> = ({
  trip,
  onBack,
  onEditClick,
  copied,
  onCopyLink,
  onTriggerPrint
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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center text-slate-700 hover:text-slate-900 bg-white shadow-xs transition-all cursor-pointer"
          title="Return to list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Active Trip Operations</span>
          <h2 className="text-2xl sm:text-2xl font-black uppercase text-slate-800 tracking-tight truncate max-w-md">
            {trip.title}
          </h2>
        </div>
      </div>

      {/* Header Options */}
      <div className="flex flex-wrap items-center gap-2">
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
      </div>
    </div>
  );
};
