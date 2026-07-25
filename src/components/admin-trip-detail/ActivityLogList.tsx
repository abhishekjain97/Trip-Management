/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TripLog } from '../../types.js';

interface ActivityLogListProps {
  logs: TripLog[];
}

export const ActivityLogList: React.FC<ActivityLogListProps> = ({ logs }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 border-b border-dashed border-slate-200 pb-2">
        Route Activity Logs
      </h3>

      <div className="space-y-4 max-h-87.5 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-center text-slate-400 text-xs italic py-6">No historical logs compiled yet.</div>
        ) : (
          logs.map((log) => {
            const logDate = new Date(log.created_at);
            const logDateStr = logDate.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
            const logTimeStr = logDate.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={log.id} className="flex items-center gap-3 text-xs border-b border-slate-100 pb-3 last:border-0">
                <div className="w-16 shrink-0 leading-tight">
                  <div className="text-[10px] font-bold text-slate-600">{logDateStr}</div>
                  <div className="text-[9px] font-mono text-slate-400">{logTimeStr}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider ${
                      log.actor_type === 'admin'
                        ? 'bg-slate-900 text-white'
                        : 'bg-emerald-100 text-emerald-950 border border-emerald-200'
                    }`}>
                      {log.actor_type}
                    </span>
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      {log.action.replace('_', ' ')}
                    </span>
                  </div>

                  {log.seat_codes && log.seat_codes.length > 0 && (
                    <div className="text-[10px]">
                      <strong>Seats:</strong>{' '}
                      <span className="font-mono font-bold text-amber-600">
                        {log.seat_codes.join(', ')}
                      </span>
                    </div>
                  )}

                  {log.details && (
                    <div className="text-[10px] text-slate-500 font-medium grid grid-cols-2 gap-2">
                      {log.details.customer_name && (
                        <div>
                          <span className="font-bold">Passenger:</span> {log.details.customer_name}
                        </div>
                      )}

                      {log.details.amount_collected && (
                        <div>
                          <span className="font-bold">Outstanding Paid:</span> ₹{log.details.amount_collected}
                        </div>
                      )}

                      {log.details.advance_amount && (
                        <div>
                          <span className="font-bold">Advance Paid:</span> ₹{log.details.advance_amount}
                        </div>
                      )}

                      {log.details.title && (
                        <div>
                          <span className="font-bold">Route:</span> {log.details.title}
                        </div>
                      )}

                      {log.details.price && (
                        <div>
                          <span className="font-bold">New Price:</span> ₹{log.details.price}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
