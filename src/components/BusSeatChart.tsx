/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TripSeat, BusModelType } from '../types.js';

interface BusSeatChartProps {
  seats: TripSeat[];
  busModel: BusModelType;
  selectedSeats: string[];
  onSeatClick: (seat: TripSeat) => void;
  isAdmin?: boolean;
  adminMode?: 'book' | 'toggle_status' | 'set_price'; // Admin can toggle between booking, blocking/enabling, or pricing seats
  underpaidSeatCodes?: string[]; // Booked seats whose booking hasn't been fully paid yet
}

export const BusSeatChart: React.FC<BusSeatChartProps> = ({
  seats,
  busModel,
  selectedSeats,
  onSeatClick,
  isAdmin = false,
  adminMode = 'book',
  underpaidSeatCodes = []
}) => {
  const [activeDeck, setActiveDeck] = useState<'lower' | 'upper'>('lower');

  const isSleeper = busModel.includes('sleeper');

  // Group seats by deck
  const mainDeckSeats = seats.filter(s => s.deck === 'main');
  const lowerDeckSeats = seats.filter(s => s.deck === 'lower');
  const upperDeckSeats = seats.filter(s => s.deck === 'upper');

  // Helper to find dimensions
  const getLayoutDimensions = (deckSeats: TripSeat[]) => {
    if (deckSeats.length === 0) return { rows: 0, cols: 0 };
    const maxRow = Math.max(...deckSeats.map(s => s.row_num));
    const maxCol = Math.max(...deckSeats.map(s => s.col_num));
    return { rows: maxRow, cols: maxCol };
  };

  const renderDeckGrid = (deckSeats: TripSeat[], deckLabel: string) => {
    const { rows, cols } = getLayoutDimensions(deckSeats);
    if (rows === 0) return null;

    // Create full grid array [row_num][col_num]
    const grid: (TripSeat | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols + 1 }, () => null)
    );

    deckSeats.forEach(seat => {
      if (seat.row_num <= rows && seat.col_num <= cols) {
        grid[seat.row_num - 1][seat.col_num] = seat;
      }
    });

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 lg:p-6 shadow-sm relative overflow-hidden max-w-full">
        {/* Bus Front Section (Top) */}
        <div className="border-b border-dashed border-slate-200 pb-4 mb-6 flex justify-between items-center bg-slate-50/50 -mx-6 -mt-6 p-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Entrance (Left)</span>
          </div>
          <div className="text-xs font-bold text-slate-600 uppercase bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
            {deckLabel} Deck
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Driver (Right)</span>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs" title="Driver Seat">
              ⎈
            </div>
          </div>
        </div>

        {/* Seats Grid */}
        <div className="space-y-4 overflow-auto">
          {grid.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-between items-stretch gap-2">
              {row.map((seat, cIdx) => {
                if (!seat) {
                  // Aisle spacer
                  return <div key={cIdx} className="min-w-16 max-w-30 min-h-[4.8rem] flex-1 flex items-center justify-center text-slate-300 text-xs font-mono select-none">Aisle</div>;
                }

                const isSelected = selectedSeats.includes(seat.seat_code);
                const isBooked = seat.status === 'booked';
                const isDisabled = seat.status === 'disabled';
                const isUnderpaid = isBooked && underpaidSeatCodes.includes(seat.seat_code);

                let bgClass = 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50';
                let textClass = 'text-slate-850';
                let badgeBg = 'bg-slate-100 text-slate-600 border-b border-slate-200';

                if (isUnderpaid) {
                  bgClass = 'bg-orange-50/50 border-orange-400 ring-1 ring-orange-400';
                  textClass = 'text-orange-950';
                  badgeBg = 'bg-orange-500 text-white border-b border-orange-600';
                } else if (isBooked) {
                  bgClass = 'bg-emerald-50/40 border-emerald-150';
                  textClass = 'text-emerald-950';
                  badgeBg = 'bg-emerald-600 text-white border-b border-emerald-700';
                } else if (isDisabled) {
                  bgClass = 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed';
                  textClass = 'text-slate-400';
                  badgeBg = 'bg-slate-200 text-slate-400 border-b border-slate-300';
                } else if (isSelected) {
                  bgClass = 'bg-amber-50/30 border-amber-500 ring-1 ring-amber-500 scale-[0.98] shadow-xs';
                  textClass = 'text-amber-950';
                  badgeBg = 'bg-amber-500 text-white border-b border-amber-600';
                }

                return (
                  <button
                    key={seat.id}
                    id={`seat-btn-${seat.seat_code}`}
                    onClick={() => onSeatClick(seat)}
                    disabled={isDisabled && !isAdmin} // Only allow admin to click disabled seats (to re-enable them)
                    className={`flex-1 min-w-16 max-w-30 min-h-[4.8rem] rounded-xl border flex flex-col items-stretch text-left transition-all overflow-hidden cursor-pointer ${bgClass}`}
                  >
                    {/* Badge top tab */}
                    <div className={`text-[10px] font-mono font-bold py-0.5 px-2 text-center select-none ${badgeBg}`}>
                      {seat.seat_code}
                    </div>

                    {/* Customer name body */}
                    <div className="p-1.5 flex-1 flex flex-col justify-center items-center gap-0.5">
                      {isBooked ? (
                        <div className="text-[11px] font-extrabold leading-tight line-clamp-2 uppercase wrap-break-word text-center text-slate-800">
                          {seat.customer_name || 'Booked'}
                        </div>
                      ) : isDisabled ? (
                        <div className="text-[10px] font-medium text-slate-400 text-center italic">
                          Blocked
                        </div>
                      ) : isSelected ? (
                        <div className="text-[10px] font-bold text-amber-600 text-center uppercase tracking-wide animate-pulse">
                          Selected
                        </div>
                      ) : (
                        <div className="text-[10px] font-semibold text-slate-400 text-center tracking-wide">
                          Available
                        </div>
                      )}
                      {isUnderpaid && (
                        <div className="text-[8px] font-black text-orange-600 uppercase tracking-wide">
                          Balance Due
                        </div>
                      )}
                      <div className={`text-[9px] font-mono font-bold ${textClass} opacity-70`}>
                        ₹{seat.price.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bus back wheels watermark */}
        <div className="absolute bottom-2 left-4 text-[9px] font-mono font-bold text-slate-300 select-none uppercase tracking-wider">
          Rear Axle
        </div>
        <div className="absolute bottom-2 right-4 text-[9px] font-mono font-bold text-slate-300 select-none uppercase tracking-wider">
          Jain Tours
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 md:space-y-6 lg:space-y-6">
      {/* Admin Mode Alert Bar */}
      {isAdmin && (
        <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse"></span>
            <p className="text-xs font-semibold">
              {adminMode === 'book' ? (
                <span><strong>Admin Mode:</strong> Click available seats to make manual bookings.</span>
              ) : adminMode === 'toggle_status' ? (
                <span><strong>Block Mode:</strong> Click any seat to instantly Block (Disable) or Enable it.</span>
              ) : (
                <span><strong>Price Mode:</strong> Click any seat, then set a custom ticket price for your selection.</span>
              )}
            </p>
          </div>
          <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-yellow-400 uppercase">
            Admin Panel
          </div>
        </div>
      )}

      {/* Tabs for sleeper decks, always showing full width for selected deck */}
      {isSleeper ? (
        <div className="space-y-2 md:space-y-6 lg:space-y-6">
          {/* Universal Tab Selectors */}
          <div className="max-w-md mx-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex">
            <button
              onClick={() => setActiveDeck('lower')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeDeck === 'lower'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lower Deck ({lowerDeckSeats.length} seats)
            </button>
            <button
              onClick={() => setActiveDeck('upper')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeDeck === 'upper'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upper Deck ({upperDeckSeats.length} seats)
            </button>
          </div>

          {/* Active Deck Full Screen Layout */}
          <div className="w-full max-w-2xl mx-auto">
            {activeDeck === 'lower' ? (
              renderDeckGrid(lowerDeckSeats, 'Lower')
            ) : (
              renderDeckGrid(upperDeckSeats, 'Upper')
            )}
          </div>
        </div>
      ) : (
        // Sitting single deck rendering
        <div className="max-w-xl mx-auto">
          {renderDeckGrid(mainDeckSeats, 'Main')}
        </div>
      )}

      {/* Aesthetic Legend Panel */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded border border-slate-200 bg-white flex flex-col overflow-hidden shadow-xs">
            <div className="bg-slate-100 h-2 border-b border-slate-200"></div>
          </div>
          <span className="text-xs font-semibold text-slate-600">Available</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded border border-amber-500 bg-amber-50/30 flex flex-col overflow-hidden shadow-xs">
            <div className="bg-amber-500 h-2 border-b border-amber-600"></div>
          </div>
          <span className="text-xs font-semibold text-slate-600">Selected</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded border border-emerald-150 bg-emerald-50/40 flex flex-col overflow-hidden shadow-xs">
            <div className="bg-emerald-600 h-2 border-b border-emerald-750"></div>
          </div>
          <span className="text-xs font-semibold text-slate-600">Booked</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded border border-orange-400 bg-orange-50/50 flex flex-col overflow-hidden shadow-xs">
            <div className="bg-orange-500 h-2 border-b border-orange-600"></div>
          </div>
          <span className="text-xs font-semibold text-slate-600">Balance Due</span>
        </div>
        <div className="flex items-center justify-center gap-2 font-medium">
          <div className="w-6 h-6 rounded border border-slate-200 bg-slate-50 opacity-60 flex flex-col overflow-hidden">
            <div className="bg-slate-200 h-2 border-b border-slate-300"></div>
          </div>
          <span className="text-xs font-semibold text-slate-500">Blocked</span>
        </div>
      </div>
    </div>
  );
};
