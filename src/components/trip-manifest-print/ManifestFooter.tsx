/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const ManifestFooter: React.FC = () => {
  return (
    <div className="border-t border-black pt-2 mt-6 text-black">
      <div className="grid grid-cols-2 gap-4 font-black text-sm uppercase">
        <div>Jain Tours & Travels*</div>
        <div className="text-right">Jain Cooking & Catering*</div>
      </div>

      <p className="text-xs font-bold mt-1">
        Contact: Mukesh Kumar Jain, Lahar ( 9425335688, 9977955688 )
      </p>

      <div className="border-t border-dashed border-black my-2"></div>

      <p className="text-[10px] font-bold text-center leading-relaxed">
        Office: Near chirayu hospital, Anupam Nagar, Patel Nagar, Gwalior, Madhya Pradesh 474002
      </p>
      <p className="text-[10px] font-bold text-center leading-relaxed">
        We provide All Kind of tour Excursion, Jain Pilgrims, Historical etc., with Food By Luxury Bus
      </p>
    </div>
  );
};
