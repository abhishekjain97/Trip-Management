/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trip, BusModelType, TripStatus } from '../../types.js';

interface EditTripModalProps {
  trip: Trip;
  hasConfirmedBookings: boolean;
  onClose: () => void;
  onSave: (updates: {
    title: string;
    trip_date: string;
    bus_model: BusModelType;
    total_seats: number;
    seat_price: number;
    advance_per_seat: number;
    description: string;
    qr_code_url: string | null;
    status: TripStatus;
  }) => Promise<void>;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({ trip, hasConfirmedBookings, onClose, onSave }) => {
  const [editTitle, setEditTitle] = useState(trip.title);
  const [editDate, setEditDate] = useState(trip.trip_date.slice(0, 10));
  const [editModel, setEditModel] = useState<BusModelType>(trip.bus_model);
  const [editSeats, setEditSeats] = useState(trip.total_seats);
  const [editPrice, setEditPrice] = useState(trip.seat_price);
  const [editAdvance, setEditAdvance] = useState(trip.advance_per_seat);
  const [editDescription, setEditDescription] = useState(trip.description);
  const [editQr, setEditQr] = useState(trip.qr_code_url || '');
  const [editStatus, setEditStatus] = useState<TripStatus>(trip.status);
  const [editSaving, setEditSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle || !editDate) return;

    setEditSaving(true);
    try {
      await onSave({
        title: editTitle,
        trip_date: editDate,
        bus_model: editModel,
        total_seats: Number(editSeats),
        seat_price: Number(editPrice),
        advance_per_seat: Number(editAdvance),
        description: editDescription,
        qr_code_url: editQr.trim() || null,
        status: editStatus
      });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl relative my-8 overflow-hidden">
        <div className="h-2 bg-amber-500"></div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black uppercase text-slate-800">
                Edit Departure Route
              </h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Update route details, pricing, and boarding notes
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-650 font-bold hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Trip Title / Route
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Departure Date
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                />
              </div>

              {/* Bus Model Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Bus Deck / Model Layout
                </label>
                <select
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value as BusModelType)}
                  disabled={hasConfirmedBookings}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="2x2_sitting">2x2 Sitting Bus (Single Deck)</option>
                  <option value="2x3_sitting">2x3 Sitting Bus (Single Deck)</option>
                  <option value="2x2_sleeper">2x2 Sleeper (Double Deck Upper/Lower)</option>
                  <option value="2x1_sleeper">2x1 Sleeper (Double Deck Upper/Lower)</option>
                </select>
              </div>

              {/* Total Seats */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Passenger Capacity (Seats)
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  max={60}
                  value={editSeats}
                  onChange={(e) => setEditSeats(Number(e.target.value))}
                  disabled={hasConfirmedBookings}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Ticket Price */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Full Seat Fare Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900 font-mono"
                />
              </div>

              {/* Required Advance per seat */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Required Advance Deposit (₹)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={editPrice}
                  value={editAdvance}
                  onChange={(e) => setEditAdvance(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900 font-mono"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Trip Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TripStatus)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {hasConfirmedBookings && (
              <p className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 -mt-1">
                Bus model & capacity are locked because this trip already has confirmed bookings.
              </p>
            )}

            {/* QR Code URL */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Operator PhonePe / UPI QR Code Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com/phonepe-upi-qr.png"
                value={editQr}
                onChange={(e) => setEditQr(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900 font-mono"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Route description & Boarding Notes
              </label>
              <textarea
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-dashed border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold uppercase tracking-wider"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {editSaving ? (
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
