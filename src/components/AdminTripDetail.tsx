/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TripDetailsResponse, TripSeat, Booking, BookingSeat, Trip } from '../types.js';
import {
  fetchTripDetails,
  bookAdminTrip,
  disableSeat,
  enableSeat,
  setSeatPrices,
  resetSeatPrices,
  verifyPayment,
  cancelBooking,
  updateTrip,
  updateBookingBalance
} from '../lib/api.js';
import { CircleAlert } from 'lucide-react';

import { PrintPreviewOverlay } from './admin-trip-detail/PrintPreviewOverlay.js';
import { TripDetailHeader } from './admin-trip-detail/TripDetailHeader.js';
import { TripFinancialSummary } from './admin-trip-detail/TripFinancialSummary.js';
import { SeatChartPanel } from './admin-trip-detail/SeatChartPanel.js';
import { RouteInfoCard } from './admin-trip-detail/RouteInfoCard.js';
import { BookingsTable } from './admin-trip-detail/BookingsTable.js';
import { ActivityLogList } from './admin-trip-detail/ActivityLogList.js';
import { BookSeatModal } from './admin-trip-detail/BookSeatModal.js';
import { SetPriceModal } from './admin-trip-detail/SetPriceModal.js';
import { InspectBookingModal } from './admin-trip-detail/InspectBookingModal.js';
import { EditTripModal } from './admin-trip-detail/EditTripModal.js';
import { ScreenshotLightbox } from './admin-trip-detail/ScreenshotLightbox.js';

type BookingWithSeats = Booking & { seat_codes: string[]; seats_details: BookingSeat[] };

interface AdminTripDetailProps {
  tripId: string;
  onBack: () => void;
}

export const AdminTripDetail: React.FC<AdminTripDetailProps> = ({ tripId, onBack }) => {
  const [data, setData] = useState<TripDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin Chart Toggle: 'book' (book manual), 'toggle_status' (disable/enable seats), or 'set_price' (per-seat price override)
  const [adminMode, setAdminMode] = useState<'book' | 'toggle_status' | 'set_price'>('book');

  // Selected seats for bulk booking, bulk blocking, or bulk pricing
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Booking Modal
  const [showBookModal, setShowBookModal] = useState(false);

  // Set Price Modal
  const [showSetPriceModal, setShowSetPriceModal] = useState(false);

  // Seat Click Inspection Modal (Booked seat details)
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectedBooking, setInspectedBooking] = useState<BookingWithSeats | null>(null);
  const [inspectedSeatCode, setInspectedSeatCode] = useState<string[]>([]);

  // Lightbox for payment screenshot
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Print Mode State
  const [isPrintMode, setIsPrintMode] = useState(false);

  const [copied, setCopied] = useState(false);

  // Edit Trip Modal
  const [showEditModal, setShowEditModal] = useState(false);

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

  const openInspectModal = (booking: BookingWithSeats) => {
    setInspectedSeatCode(booking.seat_codes);
    setInspectedBooking(booking);
    setShowInspectModal(true);
  };

  const handleSeatClick = (seat: TripSeat) => {
    if (!data) return;

    if (adminMode === 'toggle_status') {
      // Block/Enable mode selection
      if (seat.status === 'booked') {
        alert('Cannot disable a seat that is already booked. Please cancel reservation first.');
        return;
      }
      setSelectedSeats(prev =>
        prev.includes(seat.seat_code) ? prev.filter(c => c !== seat.seat_code) : [...prev, seat.seat_code]
      );
    } else if (adminMode === 'set_price') {
      // Set Price mode selection — any seat can have its price overridden regardless of status
      setSelectedSeats(prev =>
        prev.includes(seat.seat_code) ? prev.filter(c => c !== seat.seat_code) : [...prev, seat.seat_code]
      );
    } else {
      // Manual Booking Mode
      if (seat.status === 'available') {
        setSelectedSeats(prev =>
          prev.includes(seat.seat_code) ? prev.filter(c => c !== seat.seat_code) : [...prev, seat.seat_code]
        );
      } else if (seat.status === 'booked') {
        // Find booking for this seat
        const b = data.bookings.find(booking =>
          booking.status === 'confirmed' && booking.seat_codes.includes(seat.seat_code)
        );
        if (b) openInspectModal(b);
      }
    }
  };

  const handleBookSubmit = async (formData: { customerName: string; mobileNumber: string; message: string; advanceOverride: number }) => {
    try {
      await bookAdminTrip(tripId, {
        customerName: formData.customerName,
        mobileNumber: formData.mobileNumber,
        message: formData.message,
        seatCodes: selectedSeats,
        advanceOverride: formData.advanceOverride
      });
      setShowBookModal(false);
      setSelectedSeats([]);
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Booking failed');
    }
  };

  const handleBlockSelected = async () => {
    try {
      await disableSeat(tripId, selectedSeats);
      setSelectedSeats([]);
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to block seats');
    }
  };

  const handleEnableSelected = async () => {
    try {
      await enableSeat(tripId, selectedSeats);
      setSelectedSeats([]);
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to enable seats');
    }
  };

  const handleApplyPrice = async (price: number) => {
    try {
      await setSeatPrices(tripId, selectedSeats, price);
      setShowSetPriceModal(false);
      setSelectedSeats([]);
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to set seat price');
    }
  };

  const handleResetPrice = async () => {
    try {
      await resetSeatPrices(tripId, selectedSeats);
      setShowSetPriceModal(false);
      setSelectedSeats([]);
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to reset seat price');
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

  const handleSaveBalance = async (bookingId: string, balanceAmountPaid: number) => {
    await updateBookingBalance(bookingId, balanceAmountPaid);
    // Update local state smoothly
    if (inspectedBooking && inspectedBooking.id === bookingId) {
      setInspectedBooking({
        ...inspectedBooking,
        balance_amount_paid: balanceAmountPaid
      });
    }
    loadDetails();
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

  const handleUpdateTrip = async (updates: Partial<Trip>) => {
    try {
      await updateTrip(tripId, updates);
      setShowEditModal(false);
      loadDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update trip');
    }
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

  // Calculations — sum actual per-seat prices, since seats can have individual price overrides
  const totalCapacityValue = seats
    .filter(s => s.status !== 'disabled')
    .reduce((sum, s) => sum + s.price, 0);

  // Confirmed bookings totals
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const advanceCollected = confirmedBookings.reduce((sum, b) => sum + b.advance_amount_total + b.balance_amount_paid, 0);

  // Balance due = (sum of each booked seat's snapshotted price) - advance collected
  const balanceDue = confirmedBookings.reduce(
    (sum, b) => sum + b.seats_details.reduce((s2, bs) => s2 + (bs.seat_price ?? trip.seat_price), 0),
    0
  ) - advanceCollected;

  // Cheapest price among currently selected seats — bounds the admin's advance override
  const minSelectedSeatPrice = selectedSeats.length > 0
    ? Math.min(...selectedSeats.map(code => seats.find(s => s.seat_code === code)?.price ?? trip.seat_price))
    : trip.seat_price;

  return (
    <div className="space-y-8 p-1">
      {/* Printable Area Wrapper with PDF Preview and Download button */}
      {isPrintMode && (
        <PrintPreviewOverlay
          trip={trip}
          seats={seats}
          bookings={bookings}
          company={company}
          onClose={() => setIsPrintMode(false)}
        />
      )}

      <TripDetailHeader
        trip={trip}
        onBack={onBack}
        onEditClick={() => setShowEditModal(true)}
        copied={copied}
        onCopyLink={handleCopyLink}
        onTriggerPrint={() => setIsPrintMode(true)}
      />

      <TripFinancialSummary
        totalCapacityValue={totalCapacityValue}
        totalSeats={trip.total_seats}
        advanceCollected={advanceCollected}
        balanceDue={balanceDue}
        bookedCount={bookedSeats.length}
        availableCount={availableSeats.length}
        disabledCount={disabledSeats.length}
      />

      {/* Main Seat Map Grid vs Logs and Passenger Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden items-start">
        <SeatChartPanel
          seats={seats}
          busModel={trip.bus_model}
          selectedSeats={selectedSeats}
          onSeatClick={handleSeatClick}
          adminMode={adminMode}
          onAdminModeChange={setAdminMode}
          onClearSelected={() => setSelectedSeats([])}
          onBookSelectedClick={() => setShowBookModal(true)}
          onBlockSelected={handleBlockSelected}
          onEnableSelected={handleEnableSelected}
          onSetPriceClick={() => setShowSetPriceModal(true)}
        />

        {/* Side Panel: Quick Details, Bookings table & Audit Trail */}
        <div className="lg:col-span-5 space-y-8">
          <RouteInfoCard trip={trip} />
          <BookingsTable confirmedBookings={confirmedBookings} onInspect={openInspectModal} />
          <ActivityLogList logs={logs} />
        </div>
      </div>

      {/* MODAL 1: MANUAL BOOKING FORM (ADMIN COLLECTS MONEY ON THE SPOT) */}
      {showBookModal && selectedSeats.length > 0 && (
        <BookSeatModal
          selectedSeats={selectedSeats}
          seatPrice={minSelectedSeatPrice}
          defaultAdvance={trip.advance_per_seat}
          onClose={() => setShowBookModal(false)}
          onSubmit={handleBookSubmit}
        />
      )}

      {/* MODAL: PER-SEAT PRICE OVERRIDE */}
      {showSetPriceModal && selectedSeats.length > 0 && (
        <SetPriceModal
          selectedSeats={selectedSeats}
          currentPrices={selectedSeats.map(code => seats.find(s => s.seat_code === code)?.price ?? trip.seat_price)}
          defaultPrice={trip.seat_price}
          onClose={() => setShowSetPriceModal(false)}
          onSubmit={handleApplyPrice}
          onReset={handleResetPrice}
        />
      )}

      {/* MODAL 2: INSPECT BOOKED SEAT DETAILS (ADMIN REVIEWS PHONE, SCREENSHOTS & CANCEL) */}
      {showInspectModal && inspectedBooking && (
        <InspectBookingModal
          booking={inspectedBooking}
          seatCode={inspectedSeatCode}
          onClose={() => setShowInspectModal(false)}
          onVerify={handleVerify}
          onCancel={handleCancelBooking}
          onViewScreenshot={setLightboxUrl}
          onSaveBalance={handleSaveBalance}
        />
      )}

      {/* MODAL 3: EDIT TRIP DETAILS */}
      {showEditModal && (
        <EditTripModal
          trip={trip}
          hasConfirmedBookings={confirmedBookings.length > 0}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateTrip}
        />
      )}

      {/* FULLSCREEN LIGHTBOX FOR SCREENSHOTS */}
      {lightboxUrl && (
        <ScreenshotLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
};
