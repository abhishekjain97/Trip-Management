/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Booking, BookingSeat } from '../../types.js';

type BookingWithSeats = Booking & { seat_codes: string[]; seats_details: BookingSeat[] };

interface BookingsTableProps {
  confirmedBookings: BookingWithSeats[];
  onInspect: (booking: BookingWithSeats) => void;
}

export const BookingsTable: React.FC<BookingsTableProps> = ({ confirmedBookings, onInspect }) => {
  console.log('confirmedBookings', confirmedBookings);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 border-b border-dashed border-slate-200 pb-2 flex items-center justify-between">
        <span>Bookings Table</span>
        <span className="bg-slate-50 border border-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-full text-slate-500">
          {confirmedBookings.length} Active
        </span>
      </h3>

      <div className="overflow-x-auto max-h-75 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-2">Passenger</th>
              <th className="pb-2 text-center">Seats</th>
              <th className="pb-2 text-center">Advance Paid</th>
              <th className="pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {confirmedBookings.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400 italic">No bookings registered.</td>
              </tr>
            ) : (
              confirmedBookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="py-3">
                     <span className="font-bold text-slate-800 uppercase block">{b.customer_name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{b.mobile_number || 'No phone'}</span>
                  </td>
                  <td className="flex flex-wrap gap-0.5 py-3 text-center">
                    {b.seat_codes.map((seat) => (
                      <span className="bg-amber-100 text-amber-950 font-black font-mono border border-amber-300 px-2 py-0.5 rounded text-[10px]">
                        {seat}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 text-center">
                    <span className="font-mono font-bold text-emerald-800 block">₹{b.advance_amount_total}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${
                      b.payment_verified ? 'text-emerald-600' : 'text-red-500 animate-pulse'
                    }`}>
                      {b.payment_verified ? 'Verified' : 'Pending Screenshot'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onInspect(b)}
                      className="text-[10px] font-black text-slate-900 hover:text-amber-500 uppercase tracking-wide cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
