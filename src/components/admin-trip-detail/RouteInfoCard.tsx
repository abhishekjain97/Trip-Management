/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trip } from '../../types.js';

interface RouteInfoCardProps {
  trip: Trip;
}

export const RouteInfoCard: React.FC<RouteInfoCardProps> = ({ trip }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 border-b border-dashed border-slate-200 pb-2">
        Departure Route Information
      </h3>
      <div className="grid grid-cols-2 gap-4 text-xs font-mono font-bold text-slate-600">
        <div>
          <strong>Price per Seat:</strong> ₹{trip.seat_price}
        </div>
        <div>
          <strong>Minimum Deposit:</strong> ₹{trip.advance_per_seat}
        </div>
      </div>
      {trip.description && (
        <p className="text-xs text-slate-500 leading-relaxed font-medium bg-slate-50 p-4 border border-slate-100 rounded-xl uppercase tracking-wide">
          {trip.description}
        </p>
      )}
    </div>
  );
};
