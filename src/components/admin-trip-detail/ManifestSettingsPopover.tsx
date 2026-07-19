/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { PassengerTableFontSize } from '../TripManifestPrint.js';
import { ToggleSwitch } from '../shared/ToggleSwitch.js';

interface ManifestSettingsPopoverProps {
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  fontSize: PassengerTableFontSize;
  onFontSizeChange: (size: PassengerTableFontSize) => void;
  showMobile: boolean;
  onShowMobileChange: (value: boolean) => void;
  showPrice: boolean;
  onShowPriceChange: (value: boolean) => void;
  showOutstanding: boolean;
  onShowOutstandingChange: (value: boolean) => void;
  showTotalPaid: boolean;
  onShowTotalPaidChange: (value: boolean) => void;
  showPayment: boolean;
  onShowPaymentChange: (value: boolean) => void;
  showDisabledSeats: boolean;
  onShowDisabledSeatChange: (value: boolean) => void;
}

const DEFAULT_ROWS_PER_PAGE = 20;

const FONT_SIZE_OPTIONS: { value: PassengerTableFontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' }
];

export const ManifestSettingsPopover: React.FC<ManifestSettingsPopoverProps> = ({
  rowsPerPage,
  onRowsPerPageChange,
  fontSize,
  onFontSizeChange,
  showMobile,
  onShowMobileChange,
  showPrice,
  onShowPriceChange,
  showOutstanding,
  onShowOutstandingChange,
  showTotalPaid,
  onShowTotalPaidChange,
  showPayment,
  onShowPaymentChange,
  showDisabledSeats,
  onShowDisabledSeatChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(o => !o)}
        title="Manifest display settings"
        className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
          isOpen
            ? 'bg-slate-900 border-slate-900 text-white'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
        }`}
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-12 left-0 sm:left-auto sm:right-0 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-5 space-y-5 text-left max-w-[80vw] overflow-auto">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-dashed border-slate-200 pb-2">
              Manifest Display Settings
            </h4>

            {/* Rows per page */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Rows per page
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(Math.max(5, Math.min(50, Number(e.target.value) || DEFAULT_ROWS_PER_PAGE)))}
                className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Font size */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Font size
              </label>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
                {FONT_SIZE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onFontSizeChange(option.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      fontSize === option.value
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Chart Seat visibility toggles */}
            <div className="border-t border-dashed border-slate-200 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Chart Seat Visibility
              </span>
              <ToggleSwitch label="Show Disabled Seats" checked={showDisabledSeats} onChange={onShowDisabledSeatChange} />
            </div>

            {/* Column visibility toggles */}
            <div className="border-t border-dashed border-slate-200 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Column Values (headers always shown)
              </span>
              <ToggleSwitch label="Show Mobile Number" checked={showMobile} onChange={onShowMobileChange} />
              <ToggleSwitch label="Show Advance Paid" checked={showPrice} onChange={onShowPriceChange} />
              <ToggleSwitch label="Show Outstanding" checked={showOutstanding} onChange={onShowOutstandingChange} />
              <ToggleSwitch label="Show Total Paid" checked={showTotalPaid} onChange={onShowTotalPaidChange} />
              <ToggleSwitch label="Show Payment Status" checked={showPayment} onChange={onShowPaymentChange} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
