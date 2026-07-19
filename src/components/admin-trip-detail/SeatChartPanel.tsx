/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TripSeat, BusModelType } from '../../types.js';
import { BusSeatChart } from '../BusSeatChart.js';

interface SeatChartPanelProps {
  seats: TripSeat[];
  busModel: BusModelType;
  selectedSeats: string[];
  onSeatClick: (seat: TripSeat) => void;
  adminMode: 'book' | 'toggle_status';
  onAdminModeChange: (mode: 'book' | 'toggle_status') => void;
  onClearSelected: () => void;
  onBookSelectedClick: () => void;
  onBlockSelected: () => void;
  onEnableSelected: () => void;
}

export const SeatChartPanel: React.FC<SeatChartPanelProps> = ({
  seats,
  busModel,
  selectedSeats,
  onSeatClick,
  adminMode,
  onAdminModeChange,
  onClearSelected,
  onBookSelectedClick,
  onBlockSelected,
  onEnableSelected
}) => {
  return (
    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dashed border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Interactive Seat Board</h3>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">India Standard right-hand drive layout</p>
        </div>

        {/* Quick Toggle Controls */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
          <button
            onClick={() => onAdminModeChange('book')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              adminMode === 'book'
                ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Booking Mode
          </button>
          <button
            onClick={() => onAdminModeChange('toggle_status')}
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
                onClick={onBookSelectedClick}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Book Selected
              </button>
            ) : (
              <>
                <button
                  onClick={onBlockSelected}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Block Selected
                </button>
                <button
                  onClick={onEnableSelected}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Enable Selected
                </button>
              </>
            )}
            <button
              onClick={onClearSelected}
              className="px-3 py-2 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto">
        <BusSeatChart
          seats={seats}
          busModel={busModel}
          selectedSeats={selectedSeats}
          onSeatClick={onSeatClick}
          isAdmin={true}
          adminMode={adminMode}
        />
      </div>
    </div>
  );
};
