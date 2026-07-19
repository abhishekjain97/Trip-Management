/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Loader2, FileText, FileImage } from 'lucide-react';

interface CardDownloadMenuProps {
  downloading: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onDownloadPdf: () => void;
  onDownloadImage: () => void;
}

export const CardDownloadMenu: React.FC<CardDownloadMenuProps> = ({
  downloading,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onDownloadPdf,
  onDownloadImage
}) => {
  return (
    <div className="manifest-no-capture absolute top-4 right-4 print:hidden">
      <button
        onClick={onToggleMenu}
        disabled={downloading}
        title="Download this card"
        className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-700 text-white flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
          <div className="absolute top-10 right-0 z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={onDownloadPdf}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              Download as PDF
            </button>
            <button
              onClick={onDownloadImage}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer border-t border-slate-100"
            >
              <FileImage className="w-3.5 h-3.5 shrink-0" />
              Download as Image
            </button>
          </div>
        </>
      )}
    </div>
  );
};
