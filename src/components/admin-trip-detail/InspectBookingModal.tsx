/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Booking, BookingSeat } from '../../types.js';
import { Eye, CircleAlert, Ban } from 'lucide-react';

type BookingWithSeats = Booking & { seat_codes: string[]; seats_details: BookingSeat[] };

interface InspectBookingModalProps {
  booking: BookingWithSeats;
  seatCode: string[];
  onClose: () => void;
  onVerify: (bookingId: string, currentStatus: boolean) => void;
  onCancel: (bookingId: string) => void;
  onViewScreenshot: (url: string) => void;
}

export const InspectBookingModal: React.FC<InspectBookingModalProps> = ({
  booking,
  seatCode,
  onClose,
  onVerify,
  onCancel,
  onViewScreenshot
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="h-2 bg-amber-500"></div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Seat Reservation Details</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Inspecting Seat Code <span className="text-amber-600 font-mono font-black">{seatCode.join(", ")}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Passenger Info block */}
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Passenger Credentials</div>
              <div className="text-md font-black text-slate-800 uppercase">{booking.customer_name}</div>
              <div className="text-xs font-semibold text-slate-600 font-mono">
                <strong>Mobile:</strong> {booking.mobile_number || 'No contact provided'}
              </div>
              {booking.message && (
                <div className="text-xs text-slate-500 font-medium bg-white p-2.5 rounded-lg border">
                  <strong>Note:</strong> {booking.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono font-bold">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-0.5">
                <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Source</span>
                <span className="uppercase text-slate-700 text-[11px] font-black">{booking.booking_source} Booking</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-0.5">
                <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Advance Deposit</span>
                <span className="text-emerald-800 text-[11px] font-black">₹{booking.advance_amount_total}</span>
              </div>
            </div>

            {/* Uploaded Payment Screenshot */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                {booking.payment_screenshot_url && ( 
                  <>
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Payment Slip Proof</div>
                    <div className="relative group overflow-hidden border border-slate-200 rounded-xl cursor-pointer shadow-xs hover:brightness-95 transition-all">
                      <img
                        src={booking.payment_screenshot_url}
                        alt="Screenshot Proof"
                        referrerPolicy="no-referrer"
                        className="w-full h-32 object-contain bg-white"
                        onClick={() => onViewScreenshot(booking.payment_screenshot_url!)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Fullscreen</span>
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Screenshot Verification Status */}
                <div className={`flex items-center justify-between gap-3 ${booking.payment_screenshot_url ? 'border-t border-slate-200/50 mt-2 pt-2' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      booking.payment_verified ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                    }`}></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {booking.payment_verified ? 'Verified Deposit' : 'Deposit Awaiting Audit'}
                    </span>
                  </div>

                  <button
                    onClick={() => onVerify(booking.id, booking.payment_verified)}
                    className={`px-3 py-1.5 border rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                      booking.payment_verified
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                        : 'bg-emerald-900 hover:bg-emerald-800 text-white shadow-sm'
                    }`}
                  >
                    {booking.payment_verified ? 'Unverify' : 'Verify screenshot'}
                  </button>
                </div>
              </div>
            {booking.booking_source === 'public' && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-[11px] text-red-950 font-bold leading-relaxed flex items-start gap-2">
                  <CircleAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>Public booking submitted without a payment receipt screenshot. Ensure cash deposit is collected.</div>
                </div>
            )}

            {/* Action Buttons: Cancel booking */}
            <div className="flex gap-3 pt-4 border-t border-dashed border-slate-200">
              <button
                onClick={() => onCancel(booking.id)}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Ban className="w-4 h-4" />
                <span>Cancel & Release Seats</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
