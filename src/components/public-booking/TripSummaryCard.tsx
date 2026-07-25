/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trip } from '../../types.js';
import { Calendar, Bus, IndianRupee } from 'lucide-react';
import { sanitizeDescriptionHtml } from '../../lib/sanitizeHtml.js';

interface TripSummaryCardProps {
  trip: Trip;
}

export const TripSummaryCard: React.FC<TripSummaryCardProps> = ({ trip }) => {
  return (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-mono font-bold text-slate-500 border-t border-dashed border-slate-100">
        <div className="flex items-center gap-1.5">
          <IndianRupee className="w-4 h-4 text-slate-400" />
          <span>Price Per Seat: ₹{trip.seat_price}/-</span>
        </div>
        <div className="flex items-center gap-1.5">
          <IndianRupee className="w-4 h-4 text-slate-400" />
          <span>Advance Per Seat: ₹{trip.advance_per_seat}/-</span>
        </div>
      </div>

      {trip.description && (
        <div
          className="bg-slate-50 p-4 border border-slate-150 rounded-xl text-xs text-slate-600 font-medium leading-relaxed uppercase tracking-wider [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
          dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(trip.description) }}
        />
      )}
    </div>
  );
};
