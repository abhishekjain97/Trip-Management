/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trip } from '../types.js';
import { fetchTrips } from '../lib/api.js';
import { Plus, Bus } from 'lucide-react';
import { TripsStatsPanel } from './admin-trips/TripsStatsPanel.js';
import { TripCard } from './admin-trips/TripCard.js';
import { CreateTripModal } from './admin-trips/CreateTripModal.js';

interface AdminTripsProps {
  onSelectTrip: (id: string) => void;
}

export const AdminTrips: React.FC<AdminTripsProps> = ({ onSelectTrip }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

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

      <TripsStatsPanel activeTripsCount={activeTripsCount} totalSeatsAllTrips={totalSeatsAllTrips} />

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
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              isCopied={copiedTripId === trip.id}
              onSelect={onSelectTrip}
              onCopyLink={handleCopyLink}
            />
          ))}
        </div>
      )}

      {/* Create Trip Form Modal */}
      {showModal && (
        <CreateTripModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            loadTrips();
          }}
        />
      )}
    </div>
  );
};
