/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BusModelType } from '../../types.js';
import { createTrip } from '../../lib/api.js';
import { RichTextEditor } from '../shared/RichTextEditor.js';
import { ToggleSwitch } from '../shared/ToggleSwitch.js';

interface CreateTripModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({ onClose, onCreated }) => {
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formModel, setFormModel] = useState<BusModelType>('2x2_sitting');
  const [formSeats, setFormSeats] = useState(40);
  const [formPrice, setFormPrice] = useState(800);
  const [formAdvance, setFormAdvance] = useState(300);
  const [formDescription, setFormDescription] = useState('');
  const [formQr, setFormQr] = useState('');
  const [formAllowPublicBooking, setFormAllowPublicBooking] = useState(true);
  const [saving, setSaving] = useState(false);

  // Update default seat counts based on selected model
  useEffect(() => {
    if (formModel === '2x2_sitting') setFormSeats(40);
    else if (formModel === '2x3_sitting') setFormSeats(50);
    else if (formModel === '2x2_sleeper') setFormSeats(32);
    else if (formModel === '2x1_sleeper') setFormSeats(30);
  }, [formModel]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate) return;

    setSaving(true);
    try {
      await createTrip({
        title: formTitle,
        trip_date: formDate,
        bus_model: formModel,
        total_seats: Number(formSeats),
        seat_price: Number(formPrice),
        advance_per_seat: Number(formAdvance),
        description: formDescription,
        qr_code_url: formQr.trim() || null,
        status: 'active',
        allow_public_booking: formAllowPublicBooking
      });
      onCreated();
    } catch (err: any) {
      alert(err.message || 'Failed to create trip');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl h-[80vh] shadow-xl relative my-8 overflow-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Top yellow accent stripe */}
        <div className="h-2 bg-amber-500"></div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black uppercase text-slate-800">
                Create Departure Route
              </h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Deploy a new bus seat layout for online ticketing
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-650 font-bold hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Trip Title / Route
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi → Manali Special"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
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
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                />
              </div>

              {/* Bus Model Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Bus Deck / Model Layout
                </label>
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value as BusModelType)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
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
                  inputMode="numeric"
                  required
                  min={10}
                  max={60}
                  value={formSeats}
                  onChange={(e) => setFormSeats(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900 font-mono"
                />
              </div>

              {/* Ticket Price */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  Full Seat Fare Price (₹)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min={1}
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
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
                  inputMode="numeric"
                  required
                  min={0}
                  max={formPrice}
                  value={formAdvance}
                  onChange={(e) => setFormAdvance(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900 font-mono"
                />
              </div>
            </div>

            {/* QR Code URL */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Operator PhonePe / UPI QR Code Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com/phonepe-upi-qr.png"
                value={formQr}
                onChange={(e) => setFormQr(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900 font-mono"
              />
              <p className="text-[10px] text-slate-400 font-medium">
                This UPI scan QR will be rendered to customers at checkout to collect required deposit screenshots.
              </p>
            </div>

            {/* Allow Public Booking toggle */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <ToggleSwitch
                label="Allow Public Bookings"
                checked={formAllowPublicBooking}
                onChange={setFormAllowPublicBooking}
              />
              <p className="text-[10px] text-slate-400 font-medium mt-2">
                When off, the public booking link stays viewable but customers cannot submit a reservation — useful for staging a chart before it's ready to go live.
              </p>
            </div>

            {/* Description WYSIWYG helper */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Route description & Boarding Notes
              </label>
              <RichTextEditor
                value={formDescription}
                onChange={setFormDescription}
                placeholder="Provide details about boarding locations, departure timing, stopovers, and refund rules..."
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
                disabled={saving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Deploy Route Chart'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
