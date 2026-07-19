/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TripSeat } from '../../types.js';

interface DeckChartProps {
  deckSeats: TripSeat[];
  label: string;
  showDisabledSeats?: boolean;
}

// Shrinks the passenger name inside a seat box as it gets longer, so long
// names stay fully visible (wrapped) instead of being cut off mid-word.
const getSeatNameSizeClass = (name: string) => {
  const len = name.trim().length;
  if (len <= 6) return 'text-[22px]';
  if (len <= 10) return 'text-[21px]';
  if (len <= 16) return 'text-[19px]';
  if (len <= 24) return 'text-[17px]';
  return 'text-[15px]';
};

const getLayoutDimensions = (deckSeats: TripSeat[]) => {
  if (deckSeats.length === 0) return { rows: 0, cols: 0 };
  return {
    rows: Math.max(...deckSeats.map(s => s.row_num)),
    cols: Math.max(...deckSeats.map(s => s.col_num))
  };
};

export const DeckChart: React.FC<DeckChartProps> = ({ deckSeats, label, showDisabledSeats }) => {
  const { rows, cols } = getLayoutDimensions(deckSeats);
  if (rows === 0) return null;

  const grid: (TripSeat | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols + 1 }, () => null)
  );

  deckSeats.forEach(seat => {
    if (seat.row_num <= rows && seat.col_num <= cols) {
      grid[seat.row_num - 1][seat.col_num] = seat;
    }
  });

  return (
    <div className="border-2 border-black rounded-xl p-4 flex-1 flex flex-col">
      <h4 className="text-center font-bold border-b border-black pb-2 mb-3 text-xs uppercase font-mono bg-neutral-100 shrink-0">
        {label} DECK CHART
      </h4>
      <div className="flex-1 flex flex-col gap-1.5">
        {grid.map((row, rIdx) => (
          <div
            key={rIdx}
            className="grid gap-1 break-inside-avoid flex-1 auto-rows-fr"
            // Explicit equal-width columns (minmax(0, 1fr)) so every seat box
            // stays the same size regardless of how long a passenger name is.
            style={{ gridTemplateColumns: `repeat(${cols + 1}, minmax(0, 1fr))` }}
          >
            {row.map((seat, cIdx) => {
              if (!seat) {
                return <div key={cIdx} className="min-h-14"></div>;
              }

              const isBooked = seat.status === 'booked';
              const isDisabled = seat.status === 'disabled';
              const name = seat.customer_name || '';

              if (!showDisabledSeats && isDisabled) {
                return <div key={cIdx} className="min-h-14"></div>;
              }

              return (
                <div
                  key={seat.id}
                  className={`min-w-0 min-h-14 border border-black rounded flex flex-col items-stretch overflow-hidden ${
                    isBooked
                      ? 'bg-neutral-50 text-black'
                      : isDisabled
                      ? 'bg-neutral-200 text-neutral-400 font-serif line-through'
                      : 'bg-white text-neutral-800'
                  }`}
                >
                  <div className="bg-amber-400 font-bold px-1 py-0.5 text-center text-black border-b border-black font-mono text-[15px] shrink-0">
                    {seat.seat_code}
                  </div>
                  <div
                    className={`p-1 flex-1 min-h-0 flex items-center justify-center text-center font-bold uppercase wrap-break-word line-clamp-2 leading-5 ${
                      isBooked && name ? getSeatNameSizeClass(name) : 'text-[15px]'
                    }`}
                  >
                    {isBooked ? (name || 'BOOKED') : isDisabled ? 'BLOCKED' : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
