/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X } from 'lucide-react';

interface ScreenshotLightboxProps {
  url: string;
  onClose: () => void;
}

export const ScreenshotLightbox: React.FC<ScreenshotLightboxProps> = ({ url, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-60">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold hover:scale-105 transition-all cursor-pointer shadow"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={url}
        alt="Fullscreen Receipt"
        referrerPolicy="no-referrer"
        className="max-w-full max-h-[90vh] object-contain rounded-xl border border-white/10 shadow-2xl bg-white"
      />
    </div>
  );
};
