/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trip } from '../../types.js';
import { QrCode } from 'lucide-react';

interface PaymentQrCardProps {
  trip: Trip;
}

export const PaymentQrCard: React.FC<PaymentQrCardProps> = ({ trip }) => {
  return (
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
        </div>
      )}

      <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider leading-relaxed">
        Pay ₹{trip.advance_per_seat.toLocaleString('en-IN')} deposit per seat via PhonePe, GPay, Paytm, or BHIM.
        Select your seats below, then attach the screenshot as proof.
      </p>
    </div>
  );
};
