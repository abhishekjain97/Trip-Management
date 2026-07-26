/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bus, Ticket, ReceiptIndianRupee, Landmark } from 'lucide-react';

interface TripsStatsPanelProps {
  activeTripsCount: number;
  totalSeatsAllTrips: number;
}

export const TripsStatsPanel: React.FC<TripsStatsPanelProps> = ({ activeTripsCount, totalSeatsAllTrips }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 lg:gap-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
          <Bus className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Routes</span>
          <span className="text-xl font-black text-slate-800 leading-none">{activeTripsCount} Trips</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
          <Ticket className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Fleet Seats</span>
          <span className="text-xl font-black text-slate-800 leading-none">{totalSeatsAllTrips} Seats</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
          <ReceiptIndianRupee className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Price Base</span>
          <span className="text-xl font-black text-slate-800 leading-none">Standard RHD</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deposit System</span>
          <span className="text-xl font-black text-slate-800 leading-none">QR Uploads</span>
        </div>
      </div>
    </div>
  );
};
