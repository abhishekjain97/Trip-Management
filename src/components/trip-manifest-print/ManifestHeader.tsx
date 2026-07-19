/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trip, CompanySettings } from '../../types.js';

interface ManifestHeaderProps {
  trip: Trip;
  company: CompanySettings;
}

export const ManifestHeader: React.FC<ManifestHeaderProps> = ({ trip, company }) => {
  return (
    <>
      {/* Mantra Line */}
      {company.tagline && (
        <div className="text-center text-xs font-serif font-semibold text-neutral-700 tracking-widest mb-1">
          {company.tagline}
        </div>
      )}

      <div className="border-2 border-black p-3 rounded-xl flex flex-col items-center justify-center relative">
        <div className="absolute top-2 left-4 text-[10px] font-mono font-bold border border-black px-2 py-0.5 rounded bg-amber-400">
          OFFICIAL MANIFEST
        </div>
        <div className='flex items-center gap-2'>
          <div>
            <img className='w-12' src="https://xmtvpctezutrinktqcdx.supabase.co/storage/v1/object/public/jaintravels/favicon.png" />
          </div>
          <div>
            <div className="text-2xl font-black uppercase tracking-wider text-slate-950 mt-2">
              {company.company_name || 'JAIN TOURS & TRAVELS'}
            </div>
            <div className="text-xs font-medium text-neutral-600 mt-1 uppercase tracking-widest font-mono">
              Bus Boarding & Seat Layout Chart
            </div>
          </div>
        </div>

        {/* Dotted border line */}
        <div className="w-full border-t border-dashed border-black my-2"></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-xs font-mono">
          <div>
            <strong>TRIP:</strong> <span className="uppercase">{trip.title}</span>
          </div>
          <div>
            <strong>DATE:</strong> {new Date(trip.trip_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
          <div>
            <strong>BUS TYPE:</strong> <span className="uppercase">{trip.bus_model.replace('_', ' ')}</span>
          </div>
          <div>
            <strong>CAPACITY:</strong> {trip.total_seats} SEATS
          </div>
        </div>
      </div>
    </>
  );
};
