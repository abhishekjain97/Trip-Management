/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ReceiptIndianRupee, Users } from 'lucide-react';

interface TripFinancialSummaryProps {
  totalCapacityValue: number;
  totalSeats: number;
  advanceCollected: number;
  balanceDue: number;
  bookedCount: number;
  availableCount: number;
  disabledCount: number;
}

export const TripFinancialSummary: React.FC<TripFinancialSummaryProps> = ({
  totalCapacityValue,
  totalSeats,
  advanceCollected,
  balanceDue,
  bookedCount,
  availableCount,
  disabledCount
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
      {/* Total Capacity Valuation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
          <ReceiptIndianRupee className="w-6 h-6 text-slate-400" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trip Capacity Value</span>
        <span className="text-xl font-black text-slate-900 block">₹{totalCapacityValue.toLocaleString('en-IN')}</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Based on {totalSeats} Seats</span>
      </div>

      {/* Deposit/Advance Collected */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
          <ReceiptIndianRupee className="w-6 h-6 text-emerald-500" />
        </div>
        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Advance Collected</span>
        <span className="text-xl font-black text-emerald-800 block">₹{advanceCollected.toLocaleString('en-IN')}</span>
        <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide block">Verified & Secured</span>
      </div>

      {/* Balance Due */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
          <ReceiptIndianRupee className="w-6 h-6 text-amber-500" />
        </div>
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Outstanding Balance Due</span>
        <span className="text-xl font-black text-amber-800 block">₹{balanceDue.toLocaleString('en-IN')}</span>
        <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide block">Collected upon departure</span>
      </div>

      {/* Inventory count ratios */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
          <Users className="w-6 h-6 text-slate-500" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seat Allocation Ratio</span>
        <span className="text-xl font-black text-slate-900 block">{bookedCount} / {totalSeats} Booked</span>
        <div className="flex gap-2 text-[9px] font-bold uppercase tracking-wider">
          <span className="text-emerald-600">{availableCount} Free</span>
          <span className="text-slate-400">{disabledCount} Blocked</span>
        </div>
      </div>
    </div>
  );
};
