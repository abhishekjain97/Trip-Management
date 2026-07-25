/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BusModelType } from '../types';

export interface SeatLayoutSlot {
  seat_code: string;
  deck: 'upper' | 'lower' | 'main';
  side: 'left' | 'right' | 'center';
  row_num: number;
  col_num: number;
}

// Pure, deterministic seat layout for a bus model + seat count. No trip-specific state.
export function computeSeatLayout(busModel: BusModelType, totalSeats: number): SeatLayoutSlot[] {
  const seats: SeatLayoutSlot[] = [];

  if (busModel === '2x2_sitting') {
    const seatsPerRow = 4;
    const numRows = Math.ceil(totalSeats / seatsPerRow);
    let seatsRemaining = totalSeats;

    for (let r = 1; r <= numRows; r++) {
      const cols = [
        { side: 'left' as const, code: 'A', col: 0 },
        { side: 'left' as const, code: 'B', col: 1 },
        { side: 'right' as const, code: 'C', col: 3 },
        { side: 'right' as const, code: 'D', col: 4 }
      ];

      for (const col of cols) {
        if (seatsRemaining > 0) {
          seats.push({
            seat_code: `${r}${col.code}`,
            deck: 'main',
            side: col.side,
            row_num: r,
            col_num: col.col
          });
          seatsRemaining--;
        }
      }
    }
  } else if (busModel === '2x3_sitting') {
    const seatsPerRow = 5;
    const numRows = Math.ceil(totalSeats / seatsPerRow);
    let seatsRemaining = totalSeats;

    for (let r = 1; r <= numRows; r++) {
      const cols = [
        { side: 'left' as const, code: 'A', col: 0 },
        { side: 'left' as const, code: 'B', col: 1 },
        { side: 'right' as const, code: 'C', col: 3 },
        { side: 'right' as const, code: 'D', col: 4 },
        { side: 'right' as const, code: 'E', col: 5 }
      ];

      for (const col of cols) {
        if (seatsRemaining > 0) {
          seats.push({
            seat_code: `${r}${col.code}`,
            deck: 'main',
            side: col.side,
            row_num: r,
            col_num: col.col
          });
          seatsRemaining--;
        }
      }
    }
  } else if (busModel === '2x2_sleeper') {
    const seatsPerDeck = Math.ceil(totalSeats / 2);
    const upperDeckCount = totalSeats - seatsPerDeck;

    const generateSleeperDeck = (deckCount: number, deck: 'lower' | 'upper', prefix: 'L' | 'U') => {
      // Fill rows of 4 (A, B left | C, D right); if exactly 1 seat is left over,
      // it merges into the last row as a centered 5th seat instead of its own row.
      const remainder = deckCount % 4;
      const mergeLeftoverSeat = remainder === 1 && deckCount > 4;
      const numRows = mergeLeftoverSeat
        ? Math.floor(deckCount / 4)
        : Math.ceil(deckCount / 4);

      let remaining = deckCount;
      for (let r = 1; r <= numRows; r++) {
        const isLastRow = r === numRows;
        const cols = isLastRow && mergeLeftoverSeat ? [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'left' as const, code: 'M', col: 2 },
          { side: 'right' as const, code: 'C', col: 3 },
          { side: 'right' as const, code: 'D', col: 4 }
        ] : [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'right' as const, code: 'C', col: 3 },
          { side: 'right' as const, code: 'D', col: 4 }
        ];

        for (const col of cols) {
          if (remaining > 0) {
            seats.push({
              seat_code: `${prefix}-${r}${col.code}`,
              deck,
              side: col.side,
              row_num: r,
              col_num: col.col
            });
            remaining--;
          }
        }
      }
    };

    generateSleeperDeck(seatsPerDeck, 'lower', 'L');
    generateSleeperDeck(upperDeckCount, 'upper', 'U');
  } else if (busModel === '2x1_sleeper') {
    const seatsPerDeck = Math.ceil(totalSeats / 2);
    const sleepersPerRow = 3;

    let lowerRemaining = seatsPerDeck;
    const lowerRows = Math.ceil(seatsPerDeck / sleepersPerRow);
    for (let r = 1; r <= lowerRows; r++) {
      const cols = [
        { side: 'left' as const, code: 'A', col: 0 },
        { side: 'left' as const, code: 'B', col: 1 },
        { side: 'right' as const, code: 'C', col: 3 }
      ];

      for (const col of cols) {
        if (lowerRemaining > 0) {
          seats.push({
            seat_code: `L-${r}${col.code}`,
            deck: 'lower',
            side: col.side,
            row_num: r,
            col_num: col.col
          });
          lowerRemaining--;
        }
      }
    }

    let upperRemaining = totalSeats - seats.length;
    const upperRows = Math.ceil(upperRemaining / sleepersPerRow);
    for (let r = 1; r <= upperRows; r++) {
      const cols = [
        { side: 'left' as const, code: 'A', col: 0 },
        { side: 'left' as const, code: 'B', col: 1 },
        { side: 'right' as const, code: 'C', col: 3 }
      ];

      for (const col of cols) {
        if (upperRemaining > 0) {
          seats.push({
            seat_code: `U-${r}${col.code}`,
            deck: 'upper',
            side: col.side,
            row_num: r,
            col_num: col.col
          });
          upperRemaining--;
        }
      }
    }
  }

  return seats;
}
