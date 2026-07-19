/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trip } from '../../types.js';
import { QrCode, FileImage, UploadCloud, ArrowRight } from 'lucide-react';

interface CheckoutPanelProps {
  trip: Trip;
  selectedSeats: string[];
  onSubmit: (data: {
    customerName: string;
    mobileNumber: string;
    message: string;
    paymentScreenshotUrl: string | null;
  }) => Promise<void>;
}

export const CheckoutPanel: React.FC<CheckoutPanelProps> = ({ trip, selectedSeats, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalAdvanceRequired = selectedSeats.length * trip.advance_per_seat;
  const totalFullPrice = selectedSeats.length * trip.seat_price;

  // Convert uploaded image to Base64 for database screenshot saving
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File is too large. Maximum size is 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeats.length === 0 || !name.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        customerName: name,
        mobileNumber: phone,
        message,
        paymentScreenshotUrl: screenshotBase64
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>

      <div>
        <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Secure Reservation</h3>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
          Secure your seats by submitting the required deposit slip
        </p>
      </div>

      {/* Running Seats Selected List */}
      <div className="space-y-3">
        <div className="flex justify-between text-xs font-bold font-mono text-slate-600 uppercase">
          <span>Selected Seats ({selectedSeats.length})</span>
          <span className="text-amber-600 font-black">{selectedSeats.join(', ')}</span>
        </div>

        <div className="border-t border-dashed border-slate-200 pt-3 space-y-2">
          {/* Full Tickets Calculation */}
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase font-mono">
            <span>Full Ticket Price</span>
            <span>₹{trip.seat_price} × {selectedSeats.length} = ₹{totalFullPrice.toLocaleString('en-IN')}</span>
          </div>

          {/* Advance required (read-only for customers) */}
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-emerald-800">Required Advance (₹{trip.advance_per_seat}/seat)</span>
            <span className="font-black text-emerald-900 text-sm">₹{totalAdvanceRequired.toLocaleString('en-IN')}</span>
          </div>

          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed text-center uppercase tracking-wide">
            Pay deposit now via UPI, and pay the remaining balance of ₹{(totalFullPrice - totalAdvanceRequired).toLocaleString('en-IN')} upon boarding.
          </p>
        </div>
      </div>

      {/* Booking Checkout form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Passenger Name */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            Full Name (Required)
          </label>
          <input
            type="text"
            required
            placeholder="Enter traveler full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900 font-mono"
          />
        </div>

        {/* Note */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            Boarding Point / Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Board from Sector 12 Metro Station"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
          />
        </div>

        {/* UPI QR Code scan instruction block */}
        <div className="space-y-3 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">Scan & Pay Deposit</span>
          </div>

          {trip.qr_code_url ? (
            <div className="flex justify-center bg-white p-2 rounded-lg border border-slate-200 max-w-37.5 mx-auto shadow-xs">
              <img
                src={trip.qr_code_url}
                alt="UPI Payment QR"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain"
              />
            </div>
          ) : (
            <div className="p-4 border border-dashed border-white/20 rounded-lg text-center">
              <div className="text-[10px] font-mono text-slate-300">UPI ID for Direct Transfers:</div>
              <div className="font-bold text-sm text-amber-400 font-mono tracking-wide mt-1 select-all">jaintours@upi</div>
              <div className="text-[9px] text-slate-400 mt-2 uppercase tracking-wider leading-relaxed">
                Please pay ₹{totalAdvanceRequired.toLocaleString('en-IN')} deposit and submit the screenshot.
              </div>
            </div>
          )}

          <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider leading-relaxed">
            Scan using PhonePe, GPay, Paytm, or BHIM. Attach screenshot proof below.
          </p>
        </div>

        {/* Screenshot Upload with Drag-and-drop capability */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            Upload Payment Screenshot Receipt
          </label>

          <div className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center transition-all relative bg-slate-50">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />

            {screenshotBase64 ? (
              <div className="space-y-2 flex flex-col items-center">
                <FileImage className="w-8 h-8 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Receipt Attached Successfully!</span>
                <img
                  src={screenshotBase64}
                  alt="Screenshot Proof Preview"
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 object-contain rounded border bg-white"
                />
              </div>
            ) : (
              <div className="space-y-1 flex flex-col items-center text-slate-400">
                <UploadCloud className="w-8 h-8 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Click or Drag Image here</span>
                <span className="text-[9px] font-medium text-slate-400 block uppercase">Max file size 8MB (JPEG, PNG)</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-800 font-bold uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <span>Secure Seat Reservation</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
