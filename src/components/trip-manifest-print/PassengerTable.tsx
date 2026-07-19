/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Booking } from '../../types.js';

export type PassengerTableFontSize = 'small' | 'medium' | 'large';

const TABLE_TEXT_SIZE_CLASSES: Record<PassengerTableFontSize, string> = {
  small: 'text-[9px]',
  medium: 'text-[11px]',
  large: 'text-[13px]'
};

const BADGE_TEXT_SIZE_CLASSES: Record<PassengerTableFontSize, string> = {
  small: 'text-[7px]',
  medium: 'text-[9px]',
  large: 'text-[11px]'
};

interface PassengerTableProps {
  // The exact rows to render on this page — already filtered/chunked by the caller.
  bookings: (Booking & { seat_codes: string[] })[];
  // S.No continues counting across pages instead of resetting to 1 on each page.
  startIndex?: number;
  fontSize?: PassengerTableFontSize;
  // Column headers always stay put — these only hide/show the values underneath.
  showMobile?: boolean;
  showPrice?: boolean;
  showPayment?: boolean;
}

const HIDDEN_PLACEHOLDER = '-';

export const PassengerTable: React.FC<PassengerTableProps> = ({
  bookings: activeBookings,
  startIndex = 0,
  fontSize = 'medium',
  showMobile = true,
  showPrice = true,
  showPayment = true
}) => {
  return (
    <table className={`w-full text-left border-collapse border border-black font-mono ${TABLE_TEXT_SIZE_CLASSES[fontSize]}`}>
      <thead>
        <tr className="bg-neutral-100 uppercase border-b border-black">
          <th className="border-r border-black p-2 w-10 text-center">S.No</th>
          <th className="border-r border-black p-2 w-25">Seats</th>
          <th className="border-r border-black p-2">Passenger Name</th>
          <th className="border-r border-black p-2 w-32">Mobile Number</th>
          <th className="border-r border-black p-2 w-24 text-right">Advance Paid</th>
          <th className="border-r border-black p-2 w-24 text-center">Payment</th>
          <th className="p-2 w-24 text-center">Sign</th>
        </tr>
      </thead>
      <tbody>
        {activeBookings.length === 0 ? (
          <tr>
            <td colSpan={7} className="text-center p-4 text-neutral-500 italic">
              No confirmed bookings found on this trip.
            </td>
          </tr>
        ) : (
          activeBookings.map((booking, idx) => (
            <tr key={booking.id} className="border-b border-black hover:bg-neutral-50 break-inside-avoid">
              <td className="border-r border-black p-2 text-center">{startIndex + idx + 1}</td>
              <td className="border-r border-black p-2 font-bold text-amber-600">
                {booking.seat_codes.join(', ')}
              </td>
              <td className="border-r border-black p-2 font-extrabold uppercase">
                {booking.customer_name}
              </td>
              <td className="border-r border-black p-2">
                {showMobile ? (booking.mobile_number || 'N/A') : HIDDEN_PLACEHOLDER}
              </td>
              <td className="border-r border-black p-2 text-center font-bold text-emerald-800">
                {showPrice ? `₹${booking.advance_amount_total.toLocaleString('en-IN')}` : HIDDEN_PLACEHOLDER}
              </td>
              <td className="border-r border-black p-2 text-center">
                {showPayment ? (
                  <span className={`px-2 py-0.5 rounded border font-bold uppercase ${BADGE_TEXT_SIZE_CLASSES[fontSize]} ${
                    booking.payment_verified
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                      : 'bg-red-100 border-red-300 text-red-950'
                  }`}>
                    {booking.payment_verified ? 'VERIFIED' : 'PENDING'}
                  </span>
                ) : HIDDEN_PLACEHOLDER}
              </td>
              <td className="p-2 border-b border-black"></td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};
