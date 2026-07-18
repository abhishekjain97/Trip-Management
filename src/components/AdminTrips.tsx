/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trip, BusModelType } from '../types.js';
import { fetchTrips, createTrip } from '../lib/api.js';
import { Plus, Calendar, Bus, Ticket, Copy, Check, Eye, Trash2, IndianRupee, Landmark } from 'lucide-react';

interface AdminTripsProps {
  onSelectTrip: (id: string) => void;
}

export const AdminTrips: React.FC<AdminTripsProps> = ({ onSelectTrip }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formModel, setFormModel] = useState<BusModelType>('2x2_sitting');
  const [formSeats, setFormSeats] = useState(40);
  const [formPrice, setFormPrice] = useState(800);
  const [formAdvance, setFormAdvance] = useState(300);
  const [formDescription, setFormDescription] = useState('');
  const [formQr, setFormQr] = useState('');

  const [saving, setSaving] = useState(false);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  // Update default seat counts based on selected model
  useEffect(() => {
    if (formModel === '2x2_sitting') setFormSeats(40);
    else if (formModel === '2x3_sitting') setFormSeats(50);
    else if (formModel === '2x2_sleeper') setFormSeats(32);
    else if (formModel === '2x1_sleeper') setFormSeats(30);
  }, [formModel]);

  const loadTrips = async () => {
    try {
      const data = await fetchTrips();
      // Sort trips so newer trips are on top
      setTrips(data.sort((a, b) => new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime()));
    } catch (err: any) {
      setError('Failed to fetch trip list');
    } finally {
      setLoading(false);
    }
  };

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
        status: 'active'
      });
      setShowModal(false);
      // Reset form
      setFormTitle('');
      setFormDate('');
      setFormDescription('');
      setFormQr('');
      // Reload
      loadTrips();
    } catch (err: any) {
      alert(err.message || 'Failed to create trip');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = (e: React.MouseEvent, token: string, tripId: string) => {
    e.stopPropagation();
    const publicUrl = `${window.location.origin}/trip/${token}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedTripId(tripId);
      setTimeout(() => setCopiedTripId(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate high-level stats
  const activeTripsCount = trips.filter(t => t.status === 'active').length;
  const totalSeatsAllTrips = trips.reduce((sum, t) => sum + t.total_seats, 0);

  return (
    <div className="space-y-8 p-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase text-slate-850 tracking-tight">
            Departure Dashboard
          </h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
            Create routes, configure bus types, and manage customer seat bookings
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Route Trip</span>
        </button>
      </div>

      {/* Statistics Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Routes</span>
            <span className="text-xl font-black text-slate-800 leading-none">{activeTripsCount} Trips</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Fleet Seats</span>
            <span className="text-xl font-black text-slate-800 leading-none">{totalSeatsAllTrips} Seats</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Price Base</span>
            <span className="text-xl font-black text-slate-800 leading-none">Standard RHD</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deposit System</span>
            <span className="text-xl font-black text-slate-800 leading-none">QR Uploads</span>
          </div>
        </div>
      </div>

      {/* Trips Cards List Grid */}
      {trips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center max-w-xl mx-auto space-y-4">
          <Bus className="w-16 h-16 text-slate-300 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold uppercase text-slate-800">No active trips registered</h3>
          <p className="text-xs font-semibold text-slate-400 leading-relaxed max-w-sm mx-auto uppercase tracking-wide">
            Click the "New Route Trip" button at the top right to set up your first travel chart, configure seat pricing, and start collecting bookings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trips.map((trip) => {
            const formattedDate = new Date(trip.trip_date).toLocaleDateString('en-IN', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip.id)}
                className="bg-white border border-slate-200 hover:border-amber-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-col justify-between group overflow-hidden"
              >
                {/* Visual Accent Deck Tab */}
                <div className="absolute top-0 right-0 bg-slate-100 text-slate-600 text-[9px] font-mono font-bold py-1 px-4 rounded-bl-xl uppercase tracking-wider">
                  {trip.bus_model.replace('_', ' ')}
                </div>

                <div className="space-y-4">
                  {/* Trip Title & Date */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Service Route</span>
                    <h3 className="text-lg font-black uppercase text-slate-800 group-hover:text-amber-600 transition-colors leading-snug pr-16 truncate">
                      {trip.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Pricing Overview */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-mono font-bold">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Seat Price</span>
                      <span className="text-sm font-black text-slate-800">₹{trip.seat_price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Advance Req.</span>
                      <span className="text-sm font-black text-emerald-700">₹{trip.advance_per_seat.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Share Link and Buttons */}
                <div className="mt-6 pt-4 border-t border-dashed border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Status: Active</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Share Button */}
                    <button
                      onClick={(e) => handleCopyLink(e, trip.public_share_token, trip.id)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-600 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-all border border-slate-200 hover:border-amber-400 flex items-center gap-1.5 cursor-pointer shrink-0"
                      title="Copy public customer booking portal link"
                    >
                      {copiedTripId === trip.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700 font-extrabold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 shrink-0" />
                          <span>Customer Link</span>
                        </>
                      )}
                    </button>

                    {/* View Details Button */}
                    <button className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-850 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-all cursor-pointer shadow-sm">
                      Manage Chart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Trip Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl relative my-8 overflow-hidden">
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
                  onClick={() => setShowModal(false)}
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

                {/* Description WYSIWYG helper */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Route description & Boarding Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide details about boarding locations, departure timing, stopovers, and refund rules..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-dashed border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
      )}
    </div>
  );
};
