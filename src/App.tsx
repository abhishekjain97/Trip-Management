/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AdminLogin } from './components/AdminLogin.js';
import { AdminTrips } from './components/AdminTrips.js';
import { AdminTripDetail } from './components/AdminTripDetail.js';
import { AdminSettings } from './components/AdminSettings.js';
import { PublicBooking } from './components/PublicBooking.js';
import { isAdminLoggedIn, logoutAdmin, fetchSettings } from './lib/api.js';
import { CompanySettings } from './types.js';
import { Bus, Settings, Compass, Users, LogOut, Ticket } from 'lucide-react';

type ViewType = 'hub' | 'admin_login' | 'admin_trips' | 'admin_trip_detail' | 'admin_settings' | 'public_booking';

export default function App() {
  const [view, setView] = useState<ViewType>('hub');
  const [shareToken, setShareToken] = useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(isAdminLoggedIn());
  const [company, setCompany] = useState<CompanySettings | null>(null);

  // Parse path on mount and popstate to support real address-bar routing!
  useEffect(() => {
    parseUrl();
    window.addEventListener('popstate', parseUrl);
    loadCompanySettings();
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  const loadCompanySettings = async () => {
    try {
      const data = await fetchSettings();
      setCompany(data);
    } catch (e) {
      console.warn('Failed to fetch company profile settings');
    }
  };

  const parseUrl = () => {
    const path = window.location.pathname;

    // Route 1: Public customer booking portal (/trip/:token)
    if (path.startsWith('/trip/')) {
      const token = path.split('/trip/')[1];
      if (token) {
        setShareToken(token);
        setView('public_booking');
        return;
      }
    }

    // Route 2: Admin settings (/admin/settings)
    if (path === '/admin/settings') {
      if (isAdminLoggedIn()) {
        setView('admin_settings');
      } else {
        setView('admin_login');
      }
      return;
    }

    // Route 3: Admin trip details (/admin/trips/:id)
    if (path.startsWith('/admin/trips/')) {
      const id = path.split('/admin/trips/')[1];
      if (id) {
        if (isAdminLoggedIn()) {
          setSelectedTripId(id);
          setView('admin_trip_detail');
        } else {
          setView('admin_login');
        }
        return;
      }
    }

    // Route 4: Admin trip dashboard (/admin/trips)
    if (path === '/admin/trips') {
      if (isAdminLoggedIn()) {
        setView('admin_trips');
      } else {
        setView('admin_login');
      }
      return;
    }

    // Route 5: Admin Login (/admin/login)
    if (path === '/admin/login' || path.startsWith('/admin')) {
      if (isAdminLoggedIn()) {
        setView('admin_trips');
      } else {
        setView('admin_login');
      }
      return;
    }

    // Default: Root selection hub
    setView('hub');
  };

  // Helper to change view and sync browser address bar URLs!
  const navigateTo = (newView: ViewType, pathUrl: string, params?: { shareToken?: string; tripId?: string }) => {
    window.history.pushState({}, '', pathUrl);
    if (params?.shareToken) setShareToken(params.shareToken);
    if (params?.tripId) setSelectedTripId(params.tripId);
    setView(newView);
    loadCompanySettings(); // Smoothly sync company settings on routing
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    navigateTo('admin_trips', '/admin/trips');
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsLoggedIn(false);
    navigateTo('admin_login', '/admin/login');
  };

  // Helper to determine active link highlights
  const isLinkActive = (targetView: ViewType) => view === targetView;

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      
      {/* 1. ADMIN HEADER SHELL (Shown only on admin pages when logged in) */}
      {view.startsWith('admin_') && view !== 'admin_login' && (
        <header className="bg-white border-b border-slate-200 text-slate-800 shadow-sm print:hidden sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-18">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigateTo('admin_trips', '/admin/trips')}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <img src="https://xmtvpctezutrinktqcdx.supabase.co/storage/v1/object/public/jaintravels/favicon.png" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-600 tracking-wider block uppercase">
                  {company?.tagline || 'श्री महावीराय नमः'}
                </span>
                <span className="text-sm font-black uppercase tracking-tight text-slate-800">
                  {company?.company_name || 'JAIN TOURS & TRAVEL'}
                </span>
              </div>
            </div>

            {/* Admin Nav links */}
            <nav className="flex items-center gap-3">
              <button
                onClick={() => navigateTo('admin_trips', '/admin/trips')}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLinkActive('admin_trips') || isLinkActive('admin_trip_detail')
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Trips</span>
              </button>

              <button
                onClick={() => navigateTo('admin_settings', '/admin/settings')}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLinkActive('admin_settings')
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Identity</span>
              </button>

              <div className="h-6 w-px bg-slate-200"></div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-50 text-red-600 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Logout admin session"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </nav>
          </div>
        </header>
      )}

      {/* 2. BODY VIEWS ROUTER COUPLING */}
      <main className={`${view.startsWith('admin_') && view !== 'admin_login' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}`}>
        {view === 'hub' && (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
            {/* Ambient Background decoration */}
            <div className="absolute inset-0 bg-slate-100/50 pointer-events-none opacity-40"></div>

            <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-lg relative overflow-hidden space-y-8 text-center z-10">
              {/* Top yellow accent stripe */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-amber-500"></div>

              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-white mx-auto shadow-md transition-transform hover:scale-105">
                  <Bus className="w-9 h-9" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight uppercase">
                  Bus Booking Management
                </h1>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                  Enterprise dashboard & customer booking portal for fleet operators
                </p>
              </div>

              {/* Choice Hub Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Admin panel launcher */}
                <button
                  onClick={() => {
                    if (isLoggedIn) {
                      navigateTo('admin_trips', '/admin/trips');
                    } else {
                      navigateTo('admin_login', '/admin/login');
                    }
                  }}
                  className="bg-slate-900 text-white hover:bg-slate-800 p-6 rounded-2xl shadow-sm text-center transition-all hover:scale-[1.01] cursor-pointer flex flex-col items-center justify-center space-y-2 group"
                >
                  <Users className="w-8 h-8 text-amber-500 group-hover:scale-105 transition-transform" />
                  <span className="text-sm font-bold uppercase tracking-wide block">Operator Admin</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Manage seat charts</span>
                </button>

                {/* Simulated public customer portal fallback helper */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-xs text-center flex flex-col items-center justify-center space-y-2">
                  <Ticket className="w-8 h-8 text-amber-500" />
                  <span className="text-sm font-bold uppercase tracking-wide text-slate-800 block">Customer Portal</span>
                  <span className="text-[10px] text-slate-500 font-medium leading-normal block uppercase">
                    Login to Admin Panel first to create trips and generate public booking links.
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 flex items-center justify-center gap-6 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                <span>RHD India Layout</span>
                <span>•</span>
                <span>Lock Conflict Prevention</span>
                <span>•</span>
                <span>PDF Print Maps</span>
              </div>
            </div>
          </div>
        )}

        {view === 'admin_login' && (
          <AdminLogin onLoginSuccess={handleLoginSuccess} />
        )}

        {view === 'admin_trips' && (
          <AdminTrips onSelectTrip={(id) => navigateTo('admin_trip_detail', `/admin/trips/${id}`, { tripId: id })} />
        )}

        {view === 'admin_trip_detail' && (
          <AdminTripDetail tripId={selectedTripId} onBack={() => navigateTo('admin_trips', '/admin/trips')} />
        )}

        {view === 'admin_settings' && (
          <AdminSettings />
        )}

        {view === 'public_booking' && (
          <PublicBooking shareToken={shareToken} />
        )}
      </main>
    </div>
  );
}
