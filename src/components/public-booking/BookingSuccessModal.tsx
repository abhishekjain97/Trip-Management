/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Booking } from '../../types.js';
import { CheckCircle } from 'lucide-react';

interface BookingSuccessModalProps {
  booking: Booking;
  companyName: string;
  selectedSeats: string[];
  onClose: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({ booking, companyName, selectedSeats, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden text-center">
        <div className="h-1.5 bg-emerald-500"></div>
        <div className="p-6 sm:p-8 space-y-6">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-pulse" />

          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">Ticket Reservation Secure!</h3>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Thank you for booking with {companyName || 'Jain Tours & Travel'}
            </p>
          </div>

          {/* Receipt info block */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left text-xs font-mono font-bold space-y-2 text-slate-600 uppercase">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Passenger Name</span>
              <span className="text-slate-950 font-black">{booking.customer_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Secured Seats</span>
              <span className="text-amber-600 font-black text-sm">{selectedSeats.join(', ')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Advance Paid Deposit</span>
              <span className="text-emerald-800 font-black">₹{booking.advance_amount_total}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded text-[9px] border border-emerald-200">
                Awaiting Verification
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl shadow-sm cursor-pointer transition-all"
          >
            Return to seat map
          </button>
        </div>
      </div>
    </div>
  );
};
