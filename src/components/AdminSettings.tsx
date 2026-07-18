/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CompanySettings } from '../types.js';
import { fetchSettings, updateSettings } from '../lib/api.js';
import { Building, Bookmark, Image, ShieldCheck, CheckCircle } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
      setCompanyName(data.company_name);
      setTagline(data.tagline);
      setLogoUrl(data.logo_url);
      setHeaderImageUrl(data.header_image_url);
    } catch (err: any) {
      setError('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const updated = await updateSettings({
        company_name: companyName,
        tagline,
        logo_url: logoUrl,
        header_image_url: headerImageUrl
      });
      setSettings(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Preset logo options for fast Operator UI setup
  const logoPresets = [
    { name: 'Classic Gold Badge', url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Express Bus Icon', url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=100&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-1">
      {/* Settings Header */}
      <div>
        <h2 className="text-2xl font-black uppercase text-slate-800 tracking-tight">
          Branding & Identity
        </h2>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
          Customize company assets reused across customer portals and PDF charts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Editor Form */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-950">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs font-bold leading-relaxed">
                  Branding settings saved successfully! Changes are live immediately.
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-950">
                <ShieldCheck className="w-5 h-5 text-red-600 shrink-0" />
                <div className="text-xs font-bold leading-relaxed">{error}</div>
              </div>
            )}

            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Company / Operator Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Jain Tours & Travel"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </div>

             {/* Divine Tagline / Mantra */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Mantra Tagline (Header Center)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Bookmark className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. श्री महावीराय नमः"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                This is centered at the absolute top of customer booking screens and physical paper printed charts.
              </p>
            </div>

            {/* Custom Logo Image URL */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Company Logo URL (Square Image)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Image className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.jpg"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
              
              {/* Presets */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Presets:</span>
                {logoPresets.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setLogoUrl(preset.url)}
                    className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-all border border-slate-200"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Header Image Backdrop URL */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                Portal Banner Backdrop Image URL (Wide Landscape)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Image className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={headerImageUrl}
                  onChange={(e) => setHeaderImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Provide a wide landscape image. This renders as a background hero banner on the customer booking URL.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save Branding Configurations'
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Interactive Live Preview Card */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Identity Live Preview</h4>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-center">
            {/* Top mantra */}
            <div className="text-[9px] font-serif font-bold text-slate-600 tracking-widest italic border-b border-dashed border-slate-200 pb-2">
              {tagline || 'श्री महावीराय नमः'}
            </div>

            {/* Logo image */}
            <div className="flex justify-center my-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl border border-slate-200 object-cover shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center text-white border border-slate-200 text-2xl font-black">
                  {companyName ? companyName[0].toUpperCase() : 'J'}
                </div>
              )}
            </div>

            {/* Company Name */}
            <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight leading-tight">
              {companyName || 'JAIN TOURS & TRAVEL'}
            </h3>
            
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Ready to Depart • Daily Services
            </p>

            <div className="pt-2">
              <div className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50 text-left space-y-1">
                <span className="text-[8px] font-mono font-black uppercase text-amber-600 block">Sample Ticket Title</span>
                <span className="text-xs font-bold text-slate-850 block">Delhi → Jaipur Special Express</span>
                <span className="text-[9px] text-slate-400 block font-medium">Departure: Saturday, 18 July 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
