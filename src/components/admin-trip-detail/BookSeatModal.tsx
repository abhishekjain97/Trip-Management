/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface BookSeatModalProps {
  selectedSeats: string[];
  seatPrice: number;
  defaultAdvance: number;
  onClose: () => void;
  onSubmit: (data: { customerName: string; mobileNumber: string; message: string; advanceOverride: number }) => Promise<void>;
}

export const BookSeatModal: React.FC<BookSeatModalProps> = ({ selectedSeats, seatPrice, defaultAdvance, onClose, onSubmit }) => {
  const [bookName, setBookName] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookNote, setBookNote] = useState('');
  const [bookAdvanceOverride, setBookAdvanceOverride] = useState<number>(defaultAdvance);
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeats.length === 0 || !bookName.trim()) return;

    setBookingLoading(true);
    try {
      await onSubmit({
        customerName: bookName,
        mobileNumber: bookPhone,
        message: bookNote,
        advanceOverride: Number(bookAdvanceOverride)
      });
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="h-2 bg-amber-500"></div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Manual Seat Reservation</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Book seats <span className="text-amber-600 font-mono font-black">{selectedSeats.join(', ')}</span> directly
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Passenger Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Customer Name (Required)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Abhishek Sharma"
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
              />
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Mobile Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={bookPhone}
                onChange={(e) => setBookPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900 font-mono"
              />
            </div>

            {/* Editable Advance Amount */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Advance Collected (Editable)
              </label>
              <input
                type="number"
                min={0}
                max={seatPrice}
                value={bookAdvanceOverride}
                onChange={(e) => setBookAdvanceOverride(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900 font-mono"
              />
              <p className="text-[9px] text-slate-400 font-medium">
                Operator defaults to ₹{defaultAdvance}, but you can override this based on spot cash collected.
              </p>
            </div>

            {/* Optional Note */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Operator Memo Note
              </label>
              <input
                type="text"
                placeholder="e.g. Cash paid on counter, board from Sector 12"
                value={bookNote}
                onChange={(e) => setBookNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-dashed border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 cursor-pointer text-center transition-all"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={bookingLoading}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-all"
              >
                {bookingLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Secure Seat'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
