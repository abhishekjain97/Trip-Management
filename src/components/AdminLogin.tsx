/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { loginAdmin } from '../lib/api.js';
import { Lock, Bus, ShieldAlert, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (adminData: { id: string; name: string }) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await loginAdmin(accessKey);
      onLoginSuccess(data.admin);
    } catch (err: any) {
      setError(err.message || 'Invalid access key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        {/* Yellow Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-amber-500"></div>

        <div className="flex flex-col items-center text-center mt-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md mb-4 transition-transform hover:scale-105">
            <Bus className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black uppercase text-slate-800 tracking-tight">
            Operator Access Portal
          </h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
            Trip & Seat Booking Control
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-250 p-4 rounded-xl flex items-start gap-3 text-red-950">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">
                {error}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              Operator Access Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Verify & Login</span>
              </>
            )}
          </button>
        </form>

        {/* Informational Help Box for standard preview */}
        <div className="mt-8 pt-6 border-t border-dashed border-slate-200 bg-amber-50/70 p-4 rounded-xl border border-amber-100">
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            💡 Sandbox Testing Credentials
          </h4>
          <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
            Use the default operator access key <code className="bg-amber-100 border border-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-mono font-bold">admin123</code> to authenticate and access the Admin Dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};
