/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConcurrencyErrorModalProps {
  message: string;
  onClose: () => void;
}

export const ConcurrencyErrorModal: React.FC<ConcurrencyErrorModalProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden text-center">
        <div className="h-1.5 bg-red-500"></div>
        <div className="p-6 space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
          <h3 className="text-lg font-black uppercase text-red-950 leading-none">Seat Selection Conflict</h3>
          <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase tracking-wider">
            {message}
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 font-bold uppercase text-xs tracking-wider rounded-xl shadow-sm cursor-pointer transition-all"
          >
            Choose other seats
          </button>
        </div>
      </div>
    </div>
  );
};
