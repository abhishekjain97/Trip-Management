/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompanySettings } from '../../types.js';

interface PublicBookingHeaderBannerProps {
  company: CompanySettings;
}

export const PublicBookingHeaderBanner: React.FC<PublicBookingHeaderBannerProps> = ({ company }) => {
  return (
    <div
      className="h-44 sm:h-52 bg-slate-900 relative flex items-center justify-center text-center overflow-hidden bg-cover bg-center"
      style={{
        backgroundImage: company.header_image_url ? `url(${company.header_image_url})` : 'none'
      }}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"></div>

      <div className="relative z-10 space-y-2 p-4 text-white">
        {company.tagline && (
          <p className="text-[10px] sm:text-xs font-serif font-black text-amber-400 tracking-widest uppercase">
            {company.tagline}
          </p>
        )}
        <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-wide leading-none text-white drop-shadow">
          {company.company_name || 'JAIN TOURS & TRAVEL'}
        </h1>
        <p className="text-[10px] sm:text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
          Departure Seat Reservation Portal
        </p>
      </div>
    </div>
  );
};
