/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trip } from '../../types.js';
import { TriangleAlert } from 'lucide-react';

interface DeleteTripModalProps {
  trip: Trip;
  confirmedBookingsCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteTripModal: React.FC<DeleteTripModalProps> = ({
  trip,
  confirmedBookingsCount,
  onClose,
  onConfirm
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const hasBookings = confirmedBookingsCount > 0;
  const canDelete = !hasBookings || confirmText === trip.title;

  const formattedTripDate = new Date(trip.trip_date).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="h-2 bg-red-600"></div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Delete Trip</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                {trip.title} · {formattedTripDate}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-[11px] font-bold text-red-800 leading-relaxed">
            This permanently deletes the trip and everything tied to it — bookings, payments,
            blocked seats, price overrides, and its activity log. This cannot be undone.
          </div>

          {hasBookings && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-start gap-2 text-[11px] font-bold text-red-800 leading-relaxed">
                <TriangleAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <span>
                  This trip has {confirmedBookingsCount} confirmed booking{confirmedBookingsCount === 1 ? '' : 's'} with
                  real payment data. Deleting it destroys that history permanently.
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-red-700 uppercase tracking-widest block">
                  Type "{trip.title}" to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={trip.title}
                  className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-red-500 text-slate-900"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-dashed border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 cursor-pointer text-center transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete || deleting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Delete Trip'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
