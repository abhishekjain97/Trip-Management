/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface SetPriceModalProps {
  selectedSeats: string[];
  currentPrices: number[];
  defaultPrice: number;
  onClose: () => void;
  onSubmit: (price: number) => Promise<void>;
  onReset: () => Promise<void>;
}

export const SetPriceModal: React.FC<SetPriceModalProps> = ({
  selectedSeats,
  currentPrices,
  defaultPrice,
  onClose,
  onSubmit,
  onReset
}) => {
  const allSamePrice = currentPrices.every(p => p === currentPrices[0]);
  const [price, setPrice] = useState<number>(allSamePrice ? currentPrices[0] : defaultPrice);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeats.length === 0 || price <= 0) return;

    setLoading(true);
    try {
      await onSubmit(Number(price));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="h-2 bg-amber-500"></div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Set Seat Price</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Override price for <span className="text-amber-600 font-mono font-black">{selectedSeats.join(', ')}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Price Per Seat (₹)
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900 font-mono"
              />
              <p className="text-[9px] text-slate-400 font-medium">
                Trip default is ₹{defaultPrice}. This price applies only to the {selectedSeats.length} selected seat(s).
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-dashed border-slate-200">
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 cursor-pointer text-center transition-all disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Reset to Default'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Apply Price'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
