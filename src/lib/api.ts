/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanySettings, Trip, TripSeat, Booking, TripLog, BusModelType, TripDetailsResponse } from '../types.js';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Shared fetch wrapper: any 401 (expired/invalid session) clears the stale
// token and sends the user back to the home page. Login itself uses raw
// fetch() below since a 401 there just means "wrong access key", not "session expired".
async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.href = '/';
    throw new Error('Session expired. Redirecting to home page.');
  }
  return res;
}

export async function loginAdmin(accessKey: string): Promise<{ token: string; admin: { id: string; name: string } }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessKey })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  localStorage.setItem('admin_token', data.token);
  return data;
}

export function logoutAdmin() {
  const headers = getAuthHeader();
  fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers }).catch(() => {});
  localStorage.removeItem('admin_token');
}

export function isAdminLoggedIn(): boolean {
  return !!localStorage.getItem('admin_token');
}

export async function changeAdminKey(currentKey: string, newKey: string): Promise<boolean> {
  const res = await apiFetch(`${API_BASE}/auth/change-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ currentKey, newKey })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to change access key');
  }
  return true;
}

export async function fetchSettings(): Promise<CompanySettings> {
  const res = await apiFetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
  const res = await apiFetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchTrips(): Promise<Trip[]> {
  const res = await apiFetch(`${API_BASE}/trips`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch trips');
  return res.json();
}

export async function fetchTripDetails(id: string): Promise<TripDetailsResponse> {
  const res = await apiFetch(`${API_BASE}/trips/${id}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch trip details');
  return res.json();
}

export async function createTrip(trip: Omit<Trip, 'id' | 'public_share_token' | 'created_at' | 'updated_at'>): Promise<Trip> {
  const res = await apiFetch(`${API_BASE}/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(trip)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create trip');
  }
  return res.json();
}

export async function updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
  const res = await apiFetch(`${API_BASE}/trips/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update trip');
  }
  return res.json();
}

// Public booking portal
export async function fetchPublicTrip(shareToken: string): Promise<{ trip: Trip; seats: TripSeat[]; company: CompanySettings }> {
  const res = await fetch(`${API_BASE}/public/trip/${shareToken}`);
  if (!res.ok) throw new Error('Trip not found or inactive');
  return res.json();
}

export async function bookPublicTrip(
  shareToken: string,
  payload: {
    customerName: string;
    mobileNumber: string;
    message: string;
    paymentScreenshotUrl: string | null;
    seatCodes: string[];
  }
): Promise<Booking> {
  const res = await fetch(`${API_BASE}/public/trip/${shareToken}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to complete booking');
  }
  return res.json();
}

// Admin booking operations
export async function bookAdminTrip(
  tripId: string,
  payload: {
    customerName: string;
    mobileNumber: string;
    message: string;
    seatCodes: string[];
    advanceOverride?: number;
  }
): Promise<Booking> {
  const res = await apiFetch(`${API_BASE}/admin/trips/${tripId}/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to make reservation');
  }
  return res.json();
}

export async function disableSeat(tripId: string, seatCode: string | string[]): Promise<boolean> {
  const res = await apiFetch(`${API_BASE}/admin/trips/${tripId}/seats/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ seatCodes: Array.isArray(seatCode) ? seatCode : [seatCode] })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to disable seat');
  }
  return true;
}

export async function enableSeat(tripId: string, seatCode: string | string[]): Promise<boolean> {
  const res = await apiFetch(`${API_BASE}/admin/trips/${tripId}/seats/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ seatCodes: Array.isArray(seatCode) ? seatCode : [seatCode] })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to enable seat');
  }
  return true;
}

export async function verifyPayment(bookingId: string, verified: boolean): Promise<boolean> {
  const res = await apiFetch(`${API_BASE}/admin/bookings/${bookingId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ verified })
  });
  if (!res.ok) throw new Error('Failed to verify payment');
  return true;
}

export async function updateBookingBalance(bookingId: string, balanceAmountPaid: number): Promise<boolean> {
  const res = await apiFetch(`${API_BASE}/admin/bookings/${bookingId}/balance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ balanceAmountPaid })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update balance amount');
  }
  return true;
}

export async function cancelBooking(bookingId: string): Promise<boolean> {
  const res = await apiFetch(`${API_BASE}/admin/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      ...getAuthHeader()
    }
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to cancel booking');
  }
  return true;
}
