/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TripDetailsResponse, TripSeat, Booking } from '../types.js';
import {
  fetchTripDetails,
  bookAdminTrip,
  disableSeat,
  enableSeat,
  verifyPayment,
  cancelBooking
} from '../lib/api.js';
import { BusSeatChart } from './BusSeatChart.js';
import { TripManifestPrint } from './TripManifestPrint.js';
import {
  ArrowLeft,
  DollarSign,
  Users,
  Copy,
  Check,
  Printer,
  Ban,
  CircleAlert,
  Clock,
  ShieldCheck,
  UserCheck,
  Eye,
  FileSpreadsheet,
  X
} from 'lucide-react';

interface AdminTripDetailProps {
  tripId: string;
  onBack: () => void;
}

export const AdminTripDetail: React.FC<AdminTripDetailProps> = ({ tripId, onBack }) => {
  const [data, setData] = useState<TripDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin Chart Toggle: 'book' (book manual) vs 'toggle_status' (disable/enable seats)
  const [adminMode, setAdminMode] = useState<'book' | 'toggle_status'>('book');

  // Selected seats for bulk booking or bulk blocking
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Booking Modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookName, setBookName] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookNote, setBookNote] = useState('');
  const [bookAdvanceOverride, setBookAdvanceOverride] = useState<number>(0);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Seat Click Inspection Modal (Booked seat details)
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectedBooking, setInspectedBooking] = useState<any>(null);
  const [inspectedSeatCode, setInspectedSeatCode] = useState('');

  // Lightbox for payment screenshot
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Print Mode State
  const [isPrintMode, setIsPrintMode] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDetails();
    setSelectedSeats([]);
  }, [tripId]);

  useEffect(() => {
    setSelectedSeats([]);
  }, [adminMode]);

  const loadDetails = async () => {
    try {
      const response = await fetchTripDetails(tripId);
      setData(response);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trip details');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = async (seat: TripSeat) => {
    if (!data) return;

    if (adminMode === 'toggle_status') {
      // Block/Enable mode selection
      if (seat.status === 'booked') {
        alert('Cannot disable a seat that is already booked. Please cancel reservation first.');
        return;
      }
      setSelectedSeats(prev => {
        if (prev.includes(seat.seat_code)) {
          return prev.filter(c => c !== seat.seat_code);
        } else {
          return [...prev, seat.seat_code];
        }
      });
    } else {
      // Manual Booking Mode
      if (seat.status === 'available') {
        setSelectedSeats(prev => {
          if (prev.includes(seat.seat_code)) {
            return prev.filter(c => c !== seat.seat_code);
          } else {
            return [...prev, seat.seat_code];
          }
        });
      } else if (seat.status === 'booked') {
        // Find booking for this seat
        const b = data.bookings.find(booking =>
          booking.status === 'confirmed' && booking.seat_codes.includes(seat.seat_code)
        );
        if (b) {
          setInspectedSeatCode(seat.seat_code);
          setInspectedBooking(b);
          setShowInspectModal(true);
        }
      }
    }
  };

  const submitManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeats.length === 0 || !bookName.trim()) return;

    setBookingLoading(true);
    try {
      await bookAdminTrip(tripId, {
        customerName: bookName,
        mobileNumber: bookPhone,
        message: bookNote,
        seatCodes: selectedSeats,
        advanceOverride: Number(bookAdvanceOverride)
      });
      setShowBookModal(false);
      setSelectedSeats([]);
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleVerify = async (bookingId: string, currentStatus: boolean) => {
    try {
      await verifyPayment(bookingId, !currentStatus);
      // Update local state smoothly
      if (inspectedBooking && inspectedBooking.id === bookingId) {
        setInspectedBooking({
          ...inspectedBooking,
          payment_verified: !currentStatus
        });
      }
      loadDetails();
    } catch (e) {
      alert('Failed to update verification status');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you absolutely sure you want to cancel this reservation? All selected seats will return to Available.')) return;

    try {
      await cancelBooking(bookingId);
      setShowInspectModal(false);
      loadDetails();
    } catch (e: any) {
      alert(e.message || 'Failed to cancel reservation');
    }
  };

  const handleCopyLink = () => {
    if (!data) return;
    const publicUrl = `${window.location.origin}/trip/${data.trip.public_share_token}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTriggerPrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center space-y-4">
        <CircleAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-xl font-black text-slate-800 uppercase">Trip Data Error</h3>
        <p className="text-sm font-semibold text-slate-500 uppercase">{error || 'Unable to fetch details'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-900 text-white rounded-xl">Back to dashboard</button>
      </div>
    );
  }

  const { trip, seats, bookings, logs, company } = data;

  // Booked seat codes
  const bookedSeats = seats.filter(s => s.status === 'booked');
  const disabledSeats = seats.filter(s => s.status === 'disabled');
  const availableSeats = seats.filter(s => s.status === 'available');

  // Calculations
  const totalCapacityValue = trip.total_seats * trip.seat_price;
  
  // Confirmed bookings totals
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const advanceCollected = confirmedBookings.reduce((sum, b) => sum + b.advance_amount_total, 0);

  // Balance due = (number of booked seats * seat price) - advance collected
  const totalBookedSeatsCount = confirmedBookings.reduce((sum, b) => sum + b.seat_codes.length, 0);
  const balanceDue = (totalBookedSeatsCount * trip.seat_price) - advanceCollected;

  return (
    <div className="space-y-8 p-1">
      {/* Printable Area Wrapper for browser print */}
      {isPrintMode && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <TripManifestPrint trip={trip} seats={seats} bookings={bookings} company={company} />
        </div>
      )}

      {/* Back & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center text-slate-700 hover:text-slate-900 bg-white shadow-xs transition-all cursor-pointer"
            title="Return to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Active Trip Operations</span>
            <h2 className="text-2xl sm:text-2xl font-black uppercase text-slate-800 tracking-tight truncate max-w-md">
              {trip.title}
            </h2>
          </div>
        </div>

        {/* Header Options */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Shareable Link */}
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-slate-700 font-bold uppercase text-xs tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Share link</span>
              </>
            )}
          </button>

          {/* Print Manifest */}
          <button
            onClick={handleTriggerPrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Export Printable Manifest</span>
          </button>
        </div>
      </div>

      {/* Financial Breakdown Summary Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        {/* Total Capacity Valuation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-slate-400" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trip Capacity Value</span>
          <span className="text-xl font-black text-slate-900 block">₹{totalCapacityValue.toLocaleString('en-IN')}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Based on {trip.total_seats} Seats</span>
        </div>

        {/* Deposit/Advance Collected */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Advance Collected</span>
          <span className="text-xl font-black text-emerald-800 block">₹{advanceCollected.toLocaleString('en-IN')}</span>
          <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide block">Verified & Secured</span>
        </div>

        {/* Balance Due */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-amber-500" />
          </div>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Outstanding Balance Due</span>
          <span className="text-xl font-black text-amber-800 block">₹{balanceDue.toLocaleString('en-IN')}</span>
          <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide block">Collected upon departure</span>
        </div>

        {/* Inventory count ratios */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seat Allocation Ratio</span>
          <span className="text-xl font-black text-slate-900 block">{bookedSeats.length} / {trip.total_seats} Booked</span>
          <div className="flex gap-2 text-[9px] font-bold uppercase tracking-wider">
            <span className="text-emerald-600">{availableSeats.length} Free</span>
            <span className="text-slate-400">{disabledSeats.length} Blocked</span>
          </div>
        </div>
      </div>

      {/* Main Seat Map Grid vs Logs and Passenger Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden items-start">
        {/* Seat Chart Section */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dashed border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Interactive Seat Board</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">India Standard right-hand drive layout</p>
            </div>

            {/* Quick Toggle Controls */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => setAdminMode('book')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  adminMode === 'book'
                    ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Booking Mode
              </button>
              <button
                onClick={() => setAdminMode('toggle_status')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  adminMode === 'toggle_status'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Block Seats
              </button>
            </div>
          </div>

          {/* Multi-seat Action Panel for Admin */}
          {selectedSeats.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <div className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Selected Seats ({selectedSeats.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedSeats.map(code => (
                    <span key={code} className="bg-amber-100 text-amber-950 font-black font-mono border border-amber-300 px-2.5 py-0.5 rounded text-[10px] uppercase">
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {adminMode === 'book' ? (
                  <button
                    onClick={() => {
                      setBookName('');
                      setBookPhone('');
                      setBookNote('');
                      setBookAdvanceOverride(data.trip.advance_per_seat);
                      setShowBookModal(true);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Book Selected
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          await disableSeat(tripId, selectedSeats);
                          setSelectedSeats([]);
                          loadDetails();
                        } catch (err: any) {
                          alert(err.message || 'Failed to block seats');
                        }
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Block Selected
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await enableSeat(tripId, selectedSeats);
                          setSelectedSeats([]);
                          loadDetails();
                        } catch (err: any) {
                          alert(err.message || 'Failed to enable seats');
                        }
                      }}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Enable Selected
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedSeats([])}
                  className="px-3 py-2 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-white"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <BusSeatChart
            seats={seats}
            busModel={trip.bus_model}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
            isAdmin={true}
            adminMode={adminMode}
          />
        </div>

        {/* Side Panel: Quick Details, Bookings table & Audit Trail */}
        <div className="lg:col-span-5 space-y-8">
          {/* Quick Route info */}
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

          {/* Boarding Passenger Manifest Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 border-b border-dashed border-slate-200 pb-2 flex items-center justify-between">
              <span>Bookings Table</span>
              <span className="bg-slate-50 border border-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-full text-slate-500">
                {confirmedBookings.length} Active
              </span>
            </h3>

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Passenger</th>
                    <th className="pb-2 text-center">Seats</th>
                    <th className="pb-2 text-right">Advance Paid</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {confirmedBookings.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400 italic">No bookings registered.</td>
                    </tr>
                  ) : (
                    confirmedBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="py-3">
                           <span className="font-bold text-slate-800 uppercase block">{b.customer_name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{b.mobile_number || 'No phone'}</span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="bg-amber-100 text-amber-950 font-black font-mono border border-amber-300 px-2 py-0.5 rounded text-[10px]">
                            {b.seat_codes.join(', ')}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-mono font-bold text-emerald-800 block">₹{b.advance_amount_total}</span>
                          <span className={`text-[8px] font-bold uppercase tracking-wider ${
                            b.payment_verified ? 'text-emerald-600' : 'text-red-500 animate-pulse'
                          }`}>
                            {b.payment_verified ? 'Verified' : 'Pending Screenshot'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setInspectedSeatCode(b.seat_codes[0]);
                              setInspectedBooking(b);
                              setShowInspectModal(true);
                            }}
                            className="text-[10px] font-black text-slate-900 hover:text-amber-500 uppercase tracking-wide cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Audit Activity Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 border-b border-dashed border-slate-200 pb-2">
              Route Activity Logs
            </h3>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-center text-slate-400 text-xs italic py-6">No historical logs compiled yet.</div>
              ) : (
                logs.map((log) => {
                  const logTime = new Date(log.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div key={log.id} className="flex gap-3 text-xs border-b border-slate-100 pb-3 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 font-mono text-[9px] font-bold">
                        {logTime}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider ${
                            log.actor_type === 'admin' 
                              ? 'bg-slate-900 text-white' 
                              : 'bg-emerald-100 text-emerald-950 border border-emerald-200'
                          }`}>
                            {log.actor_type}
                          </span>
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                            {log.action.replace('_', ' ')}
                          </span>
                        </div>

                        {log.seat_codes && log.seat_codes.length > 0 && (
                          <div className="text-[10px]">
                            <strong>Seats:</strong>{' '}
                            <span className="font-mono font-bold text-amber-600">
                              {log.seat_codes.join(', ')}
                            </span>
                          </div>
                        )}

                        {log.details && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            {log.details.customer_name && `Passenger: ${log.details.customer_name}`}
                            {log.details.title && `Route: ${log.details.title}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: MANUAL BOOKING FORM (ADMIN COLLECTS MONEY ON THE SPOT) */}
      {showBookModal && selectedSeats.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="h-2 bg-amber-500"></div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Manual Seat Reservation</h3>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                    Book seats <span className="text-amber-600 font-mono font-black">{selectedSeats.join(', ')}</span> directly
                  </p>
                </div>
                <button
                  onClick={() => setShowBookModal(false)}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitManualBooking} className="space-y-4">
                {/* Passenger Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Customer Name (Required)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abhishek Sharma"
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
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
                    value={bookPhone}
                    onChange={(e) => setBookPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900 font-mono"
                  />
                </div>

                {/* Editable Advance Amount */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Advance Collected (Editable)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={trip.seat_price}
                    value={bookAdvanceOverride}
                    onChange={(e) => setBookAdvanceOverride(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900 font-mono"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">
                    Operator defaults to ₹{trip.advance_per_seat}, but you can override this based on spot cash collected.
                  </p>
                </div>

                {/* Optional Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Operator Memo Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash paid on counter, board from Sector 12"
                    value={bookNote}
                    onChange={(e) => setBookNote(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-dashed border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowBookModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 cursor-pointer text-center transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-all"
                  >
                    {bookingLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Secure Seat'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT BOOKED SEAT DETAILS (ADMIN REVIEWS PHONE, SCREENSHOTS & CANCEL) */}
      {showInspectModal && inspectedBooking && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="h-2 bg-amber-500"></div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Seat Reservation Details</h3>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                    Inspecting Seat Code <span className="text-amber-600 font-mono font-black">{inspectedSeatCode}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowInspectModal(false)}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Passenger Info block */}
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Passenger Credentials</div>
                  <div className="text-md font-black text-slate-800 uppercase">{inspectedBooking.customer_name}</div>
                  <div className="text-xs font-semibold text-slate-600 font-mono">
                    <strong>Mobile:</strong> {inspectedBooking.mobile_number || 'No contact provided'}
                  </div>
                  {inspectedBooking.message && (
                    <div className="text-xs text-slate-500 font-medium bg-white p-2.5 rounded-lg border">
                      <strong>Note:</strong> {inspectedBooking.message}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono font-bold">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-0.5">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Source</span>
                    <span className="uppercase text-slate-700 text-[11px] font-black">{inspectedBooking.booking_source} Booking</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-0.5">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Advance Deposit</span>
                    <span className="text-emerald-800 text-[11px] font-black">₹{inspectedBooking.advance_amount_total}</span>
                  </div>
                </div>

                {/* Uploaded Payment Screenshot */}
                {inspectedBooking.payment_screenshot_url ? (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Payment Slip Proof</div>
                    <div className="relative group overflow-hidden border border-slate-200 rounded-xl cursor-pointer shadow-xs hover:brightness-95 transition-all">
                      <img
                        src={inspectedBooking.payment_screenshot_url}
                        alt="Screenshot Proof"
                        referrerPolicy="no-referrer"
                        className="w-full h-32 object-contain bg-white"
                        onClick={() => setLightboxUrl(inspectedBooking.payment_screenshot_url)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Fullscreen</span>
                        </span>
                      </div>
                    </div>

                    {/* Screenshot Verification Status */}
                    <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200/50 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          inspectedBooking.payment_verified ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                        }`}></div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {inspectedBooking.payment_verified ? 'Verified Deposit' : 'Deposit Awaiting Audit'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleVerify(inspectedBooking.id, inspectedBooking.payment_verified)}
                        className={`px-3 py-1.5 border rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                          inspectedBooking.payment_verified 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200' 
                            : 'bg-emerald-900 hover:bg-emerald-800 text-white shadow-sm'
                        }`}
                      >
                        {inspectedBooking.payment_verified ? 'Unverify' : 'Verify screenshot'}
                      </button>
                    </div>
                  </div>
                ) : (
                  inspectedBooking.booking_source === 'public' && (
                    <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-[11px] text-red-950 font-bold leading-relaxed flex items-start gap-2">
                      <CircleAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div>Public booking submitted without a payment receipt screenshot. Ensure cash deposit is collected.</div>
                    </div>
                  )
                )}

                {/* Action Buttons: Cancel booking */}
                <div className="flex gap-3 pt-4 border-t border-dashed border-slate-200">
                  <button
                    onClick={() => handleCancelBooking(inspectedBooking.id)}
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
      )}

      {/* FULLSCREEN LIGHTBOX FOR SCREENSHOTS */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold hover:scale-105 transition-all cursor-pointer shadow"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Fullscreen Receipt"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[90vh] object-contain rounded-xl border border-white/10 shadow-2xl bg-white"
          />
        </div>
      )}
    </div>
  );
};
