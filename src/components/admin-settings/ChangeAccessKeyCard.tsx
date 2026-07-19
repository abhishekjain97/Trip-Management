/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { changeAdminKey } from '../../lib/api.js';
import { KeyRound, CheckCircle, ShieldCheck } from 'lucide-react';

export const ChangeAccessKeyCard: React.FC = () => {
  const [currentKey, setCurrentKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    if (newKey !== confirmKey) {
      setError('New access key and confirmation do not match.');
      return;
    }
    if (newKey.length < 4) {
      setError('New access key must be at least 4 characters.');
      return;
    }

    setSaving(true);
    try {
      await changeAdminKey(currentKey, newKey);
      setSuccess(true);
      setCurrentKey('');
      setNewKey('');
      setConfirmKey('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change access key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-amber-500" />
          <span>Change Access Key</span>
        </h3>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
          Update the key used to log in to this admin panel
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-950">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs font-bold leading-relaxed">
              Access key updated successfully.
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-950">
            <ShieldCheck className="w-5 h-5 text-red-600 shrink-0" />
            <div className="text-xs font-bold leading-relaxed">{error}</div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            Current Access Key
          </label>
          <input
            type="password"
            required
            value={currentKey}
            onChange={(e) => setCurrentKey(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            New Access Key
          </label>
          <input
            type="password"
            required
            minLength={4}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            Confirm New Access Key
          </label>
          <input
            type="password"
            required
            minLength={4}
            value={confirmKey}
            onChange={(e) => setConfirmKey(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'Update Access Key'
          )}
        </button>
      </form>
    </div>
  );
};
