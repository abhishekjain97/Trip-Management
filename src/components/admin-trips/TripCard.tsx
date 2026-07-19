/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trip } from '../../types.js';
import { Calendar, Copy, Check } from 'lucide-react';

interface TripCardProps {
  trip: Trip;
  isCopied: boolean;
  onSelect: (tripId: string) => void;
  onCopyLink: (e: React.MouseEvent, token: string, tripId: string) => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, isCopied, onSelect, onCopyLink }) => {
  const formattedDate = new Date(trip.trip_date).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div
      onClick={() => onSelect(trip.id)}
      className="bg-white border border-slate-200 hover:border-amber-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-col justify-between group overflow-hidden"
    >
      {/* Visual Accent Deck Tab */}
      <div className="absolute top-0 right-0 bg-slate-100 text-slate-600 text-[9px] font-mono font-bold py-1 px-4 rounded-bl-xl uppercase tracking-wider">
        {trip.bus_model.replace('_', ' ')}
      </div>

      <div className="space-y-4">
        {/* Trip Title & Date */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Service Route</span>
          <h3 className="text-lg font-black uppercase text-slate-800 group-hover:text-amber-600 transition-colors leading-snug pr-16 truncate">
            {trip.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Pricing Overview */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-mono font-bold">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Seat Price</span>
            <span className="text-sm font-black text-slate-800">₹{trip.seat_price.toLocaleString('en-IN')}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Advance Req.</span>
            <span className="text-sm font-black text-emerald-700">₹{trip.advance_per_seat.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Bottom Share Link and Buttons */}
      <div className="mt-6 pt-4 border-t border-dashed border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>Status: Active</span>
        </span>

        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            onClick={(e) => onCopyLink(e, trip.public_share_token, trip.id)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-600 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-all border border-slate-200 hover:border-amber-400 flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Copy public customer booking portal link"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="text-emerald-700 font-extrabold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 shrink-0" />
                <span>Customer Link</span>
              </>
            )}
          </button>

          {/* View Details Button */}
          <button className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-850 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-all cursor-pointer shadow-sm">
            Manage Chart
          </button>
        </div>
      </div>
    </div>
  );
};
