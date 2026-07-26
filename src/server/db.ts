/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CompanySettings,
  Trip,
  TripSeat,
  Booking,
  BookingSeat,
  DisabledSeat,
  SeatPriceOverride,
  TripLog,
  BusModelType,
  TripStatus,
  BookingSource,
  BookingStatus,
  ActorType
} from '../types.js';
import { computeSeatLayout } from './seatLayout.js';

// Mutex to guarantee seat booking transactions are completely atomic
export class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          next?.();
        } else {
          this.locked = false;
        }
      };

      if (this.locked) {
        this.queue.push(() => resolve(release));
      } else {
        this.locked = true;
        resolve(release);
      }
    });
  }
}

export interface Admin {
  id: string;
  name: string;
  login_key_hash: string;
}

export interface DBStructure {
  admins: Admin[];
  company_settings: CompanySettings;
  trips: Trip[];
  bookings: Booking[];
  booking_seats: BookingSeat[];
  disabled_seats: DisabledSeat[];
  seat_price_overrides: SeatPriceOverride[];
  trip_logs: TripLog[];
}

const DB_FILE = path.join(process.cwd(), 'db.json');

export class LocalDatabase {
  private data: DBStructure;
  private mutex = new Mutex();
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.data = this.load();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      console.log('[Bus-Seat-App] Supabase configuration detected. Initializing SupabaseClient.');
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Print full instruction for tables setup
      console.log(`
        ======================================================================
        [Bus-Seat-App] SUPABASE TABLES INITIALIZATION SCRIPT:
        If you haven't done so, please run this DDL SQL in your Supabase SQL Editor:

        CREATE TABLE IF NOT EXISTS company_settings (
          id text PRIMARY KEY DEFAULT 'singleton',
          company_name text NOT NULL,
          tagline text NOT NULL,
          logo_url text NOT NULL,
          header_image_url text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS admins (
          id text PRIMARY KEY,
          name text NOT NULL,
          login_key_hash text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS trips (
          id text PRIMARY KEY,
          title text NOT NULL,
          trip_date text NOT NULL,
          bus_model text NOT NULL,
          total_seats integer NOT NULL,
          seat_price integer NOT NULL,
          advance_per_seat integer NOT NULL,
          description text NOT NULL,
          qr_code_url text,
          status text NOT NULL,
          allow_public_booking boolean NOT NULL DEFAULT true,
          public_share_token text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id text PRIMARY KEY,
          trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          customer_name text NOT NULL,
          mobile_number text,
          message text,
          payment_screenshot_url text,
          advance_amount_total integer NOT NULL,
          balance_amount_paid integer NOT NULL DEFAULT 0,
          booking_source text NOT NULL,
          payment_verified boolean NOT NULL,
          status text NOT NULL,
          created_at text NOT NULL,
          cancelled_at text,
          cancelled_by text
        );

        CREATE TABLE IF NOT EXISTS booking_seats (
          id text PRIMARY KEY,
          booking_id text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
          trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          seat_code text NOT NULL,
          advance_amount_for_seat integer NOT NULL,
          seat_price integer,
          active boolean NOT NULL DEFAULT true
        );

        CREATE UNIQUE INDEX IF NOT EXISTS booking_seats_active_seat_uq
          ON booking_seats(trip_id, seat_code) WHERE active;

        CREATE TABLE IF NOT EXISTS disabled_seats (
          id text PRIMARY KEY,
          trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          seat_code text NOT NULL,
          disabled_at text NOT NULL,
          disabled_by text,
          UNIQUE(trip_id, seat_code)
        );

        CREATE TABLE IF NOT EXISTS seat_price_overrides (
          id text PRIMARY KEY,
          trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          seat_codes text[] NOT NULL,
          price integer NOT NULL,
          set_at text NOT NULL,
          set_by text
        );

        CREATE INDEX IF NOT EXISTS seat_price_overrides_trip_idx ON seat_price_overrides(trip_id);

        CREATE TABLE IF NOT EXISTS trip_logs (
          id text PRIMARY KEY,
          trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          actor_type text NOT NULL,
          actor_id text,
          action text NOT NULL,
          seat_codes text[] NULL,
          details jsonb NOT NULL,
          created_at text NOT NULL
        );
        ======================================================================
      `);
    } else {
      console.log('[Bus-Seat-App] No Supabase credentials. Defaulting to local db.json.');
    }
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private load(): DBStructure {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(content);
        // Tolerate pre-batching legacy rows shaped { seat_code: string } instead of { seat_codes: string[] }
        if (Array.isArray(parsed.seat_price_overrides)) {
          parsed.seat_price_overrides = parsed.seat_price_overrides.map((o: any) =>
            o.seat_codes ? o : { ...o, seat_codes: [o.seat_code], seat_code: undefined }
          );
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading DB file, reinitializing', e);
    }

    // Default structure with Jain Tours & Travel details
    const defaultDB: DBStructure = {
      admins: [
        {
          id: 'admin-1',
          name: 'Jain Tours Admin',
          login_key_hash: this.hashKey('admin123') // Default access key is admin123
        }
      ],
      company_settings: {
        company_name: 'Jain Tours & Travel',
        tagline: 'श्री महावीराय नमः',
        logo_url: '',
        header_image_url: ''
      },
      trips: [],
      bookings: [],
      booking_seats: [],
      disabled_seats: [],
      seat_price_overrides: [],
      trip_logs: []
    };

    this.saveDirect(defaultDB);
    return defaultDB;
  }

  private saveDirect(dbData: DBStructure) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write to DB file', e);
    }
  }

  public save() {
    this.saveDirect(this.data);
  }

  // Transaction lock for booking operations
  public async lock(): Promise<() => void> {
    return this.mutex.acquire();
  }

  // --- Auth operations ---
  public async verifyAdminKey(key: string): Promise<Admin | null> {
    const hash = this.hashKey(key);
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('admins')
          .select('*')
          .eq('login_key_hash', hash)
          .maybeSingle();
        if (error) throw error;
        // Supabase answered definitively (row found or not) — trust it. Only
        // an actual query failure below should fall back to the local copy;
        // otherwise a key invalidated in Supabase would still work via a stale
        // local record that never got the update.
        return data || null;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase verifyAdminKey error, falling back to local:', e.message);
      }
    }
    const admin = this.data.admins.find(a => a.login_key_hash === hash);
    return admin || null;
  }

  public async updateAdminKey(adminId: string, newKey: string): Promise<boolean> {
    const hash = this.hashKey(newKey);
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('admins')
          .update({ login_key_hash: hash })
          .eq('id', adminId);
        if (error) throw error;
        return true;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase updateAdminKey error, falling back to local:', e.message);
      }
    }
    const admin = this.data.admins.find(a => a.id === adminId);
    if (!admin) return false;
    admin.login_key_hash = hash;
    this.save();
    return true;
  }

  // --- Settings operations ---
  public async getSettings(): Promise<CompanySettings> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('company_settings')
          .select('*')
          .eq('id', 'singleton')
          .maybeSingle();
        if (error) throw error;
        if (data) {
          return {
            company_name: data.company_name,
            tagline: data.tagline,
            logo_url: data.logo_url,
            header_image_url: data.header_image_url
          };
        } else {
          const defaultSettings = {
            id: 'singleton',
            company_name: 'Jain Tours & Travel',
            tagline: 'श्री महावीराय नमः',
            logo_url: '',
            header_image_url: ''
          };
          await this.supabase.from('company_settings').insert(defaultSettings);
          return {
            company_name: defaultSettings.company_name,
            tagline: defaultSettings.tagline,
            logo_url: defaultSettings.logo_url,
            header_image_url: defaultSettings.header_image_url
          };
        }
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getSettings error, falling back to local:', e.message);
      }
    }
    return this.data.company_settings;
  }

  public async updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('company_settings')
          .upsert({ id: 'singleton', ...settings });
        if (error) throw error;
        return await this.getSettings();
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase updateSettings error, falling back to local:', e.message);
      }
    }
    this.data.company_settings = {
      ...this.data.company_settings,
      ...settings
    };
    this.save();
    return this.data.company_settings;
  }

  // --- Trip operations ---
  public async getTrips(): Promise<Trip[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getTrips error, falling back to local:', e.message);
      }
    }
    return this.data.trips;
  }

  public async getTripById(id: string): Promise<Trip | null> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getTripById error, falling back to local:', e.message);
      }
    }
    return this.data.trips.find(t => t.id === id) || null;
  }

  public async getTripByShareToken(token: string): Promise<Trip | null> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('trips')
          .select('*')
          .eq('public_share_token', token)
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getTripByShareToken error, falling back to local:', e.message);
      }
    }
    return this.data.trips.find(t => t.public_share_token === token) || null;
  }

  public async createTrip(tripData: Omit<Trip, 'id' | 'public_share_token' | 'created_at' | 'updated_at'>): Promise<Trip> {
    const id = crypto.randomUUID();
    const public_share_token = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const newTrip: Trip = {
      ...tripData,
      id,
      public_share_token,
      created_at: now,
      updated_at: now
    };

    const log: TripLog = {
      id: crypto.randomUUID(),
      trip_id: id,
      actor_type: 'admin',
      actor_id: 'admin-1',
      action: 'trip_created',
      seat_codes: null,
      details: { title: newTrip.title, date: newTrip.trip_date },
      created_at: now
    };

    if (this.supabase) {
      try {
        const { error: tripError } = await this.supabase
          .from('trips')
          .insert(newTrip);
        if (tripError) throw tripError;

        const { error: logError } = await this.supabase
          .from('trip_logs')
          .insert(log);
        if (logError) throw logError;

        return newTrip;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase createTrip error, falling back to local:', e.message);
      }
    }

    this.data.trips.push(newTrip);
    this.logAction(log);
    this.save();
    return newTrip;
  }

  public async updateTrip(id: string, updates: Partial<Omit<Trip, 'id' | 'public_share_token' | 'created_at'>>): Promise<Trip | null> {
    const original = await this.getTripById(id);
    if (!original) return null;

    const now = new Date().toISOString();
    const updatedTrip: Trip = {
      ...original,
      ...updates,
      updated_at: now
    } as Trip;

    const modelChanged = updates.bus_model && updates.bus_model !== original.bus_model;
    const totalChanged = updates.total_seats && updates.total_seats !== original.total_seats;

    if (modelChanged || totalChanged) {
      const newLayout = computeSeatLayout(updatedTrip.bus_model, updatedTrip.total_seats);
      const validCodes = new Set(newLayout.map(s => s.seat_code));
      const activeBookingSeats = await this.getActiveBookingSeatsForTrip(id);
      const orphaned = activeBookingSeats.filter(bs => !validCodes.has(bs.seat_code));
      if (orphaned.length > 0) {
        throw new Error(
          `Cannot change bus model or capacity because seat(s) ${orphaned.map(s => s.seat_code).join(', ')} are already booked and would no longer exist in the new layout.`
        );
      }
    }

    const log: TripLog = {
      id: crypto.randomUUID(),
      trip_id: id,
      actor_type: 'admin',
      actor_id: 'admin-1',
      action: 'trip_updated',
      seat_codes: null,
      details: { updates },
      created_at: now
    };

    if (this.supabase) {
      try {
        const { error: tripError } = await this.supabase
          .from('trips')
          .update(updates)
          .eq('id', id);
        if (tripError) throw tripError;

        const { error: logError } = await this.supabase
          .from('trip_logs')
          .insert(log);
        if (logError) throw logError;

        return updatedTrip;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase updateTrip error, falling back to local:', e.message);
      }
    }

    const idx = this.data.trips.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.trips[idx] = updatedTrip;
      this.logAction(log);
      this.save();
    }
    return updatedTrip;
  }

  public async deleteTrip(id: string): Promise<boolean> {
    const release = await this.lock();
    try {
      const trip = await this.getTripById(id);
      if (!trip) return false;

      if (this.supabase) {
        try {
          const { error } = await this.supabase.from('trips').delete().eq('id', id);
          if (error) throw error;
          return true;
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase deleteTrip error, falling back to local:', e.message);
        }
      }

      this.data.trips = this.data.trips.filter(t => t.id !== id);
      this.data.bookings = this.data.bookings.filter(b => b.trip_id !== id);
      this.data.booking_seats = this.data.booking_seats.filter(bs => bs.trip_id !== id);
      this.data.disabled_seats = this.data.disabled_seats.filter(d => d.trip_id !== id);
      this.data.seat_price_overrides = this.data.seat_price_overrides.filter(o => o.trip_id !== id);
      this.data.trip_logs = this.data.trip_logs.filter(l => l.trip_id !== id);
      this.save();
      return true;
    } finally {
      release();
    }
  }

  // --- Seat operations ---

  // Active (non-cancelled) booking_seats rows for a trip — the source of truth for "booked".
  private async getActiveBookingSeatsForTrip(tripId: string): Promise<BookingSeat[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('booking_seats')
          .select('*')
          .eq('trip_id', tripId)
          .eq('active', true);
        if (error) throw error;
        return data || [];
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getActiveBookingSeatsForTrip error, falling back to local:', e.message);
      }
    }
    return this.data.booking_seats.filter(bs => bs.trip_id === tripId && bs.active);
  }

  private async getDisabledSeatCodes(tripId: string): Promise<Set<string>> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('disabled_seats')
          .select('seat_code')
          .eq('trip_id', tripId);
        if (error) throw error;
        return new Set((data || []).map((d: any) => d.seat_code));
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getDisabledSeatCodes error, falling back to local:', e.message);
      }
    }
    return new Set(this.data.disabled_seats.filter(d => d.trip_id === tripId).map(d => d.seat_code));
  }

  // All seat_price_overrides rows for a trip — each row now covers a group of seat codes.
  private async getSeatPriceOverrideRows(tripId: string): Promise<SeatPriceOverride[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('seat_price_overrides')
          .select('*')
          .eq('trip_id', tripId);
        if (error) throw error;
        return data || [];
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getSeatPriceOverrideRows error, falling back to local:', e.message);
      }
    }
    return this.data.seat_price_overrides.filter(o => o.trip_id === tripId);
  }

  private async getSeatPriceOverrides(tripId: string): Promise<Map<string, number>> {
    const rows = await this.getSeatPriceOverrideRows(tripId);
    const map = new Map<string, number>();
    rows.forEach(row => row.seat_codes.forEach(code => map.set(code, row.price)));
    return map;
  }

  // Given the current override rows for a trip and a set of seat codes about to be re-priced or
  // reset, compute which rows need to shrink (partial overlap) or disappear (fully consumed).
  private planSeatPriceOverrideSplit(
    rows: SeatPriceOverride[],
    codesToRemove: string[]
  ): { toDelete: string[]; toUpdate: { id: string; seat_codes: string[] }[] } {
    const toDelete: string[] = [];
    const toUpdate: { id: string; seat_codes: string[] }[] = [];

    rows.forEach(row => {
      const overlaps = row.seat_codes.some(c => codesToRemove.includes(c));
      if (!overlaps) return;

      const remaining = row.seat_codes.filter(c => !codesToRemove.includes(c));
      if (remaining.length === 0) {
        toDelete.push(row.id);
      } else {
        toUpdate.push({ id: row.id, seat_codes: remaining });
      }
    });

    return { toDelete, toUpdate };
  }

  public async getTripSeats(tripId: string): Promise<TripSeat[]> {
    const trip = await this.getTripById(tripId);
    if (!trip) return [];

    const layout = computeSeatLayout(trip.bus_model, trip.total_seats);
    const activeBookingSeats = await this.getActiveBookingSeatsForTrip(tripId);
    const disabledCodes = await this.getDisabledSeatCodes(tripId);
    const priceOverrides = await this.getSeatPriceOverrides(tripId);

    const bookingIds = Array.from(new Set(activeBookingSeats.map(bs => bs.booking_id)));
    let bookingNameMap = new Map<string, string>();
    if (bookingIds.length > 0) {
      if (this.supabase) {
        try {
          const { data, error } = await this.supabase
            .from('bookings')
            .select('id, customer_name')
            .in('id', bookingIds)
            .eq('status', 'confirmed');
          if (error) throw error;
          bookingNameMap = new Map((data || []).map((b: any) => [b.id, b.customer_name]));
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase getTripSeats bookings lookup error, falling back to local:', e.message);
          bookingNameMap = new Map(
            this.data.bookings
              .filter(b => bookingIds.includes(b.id) && b.status === 'confirmed')
              .map(b => [b.id, b.customer_name])
          );
        }
      } else {
        bookingNameMap = new Map(
          this.data.bookings
            .filter(b => bookingIds.includes(b.id) && b.status === 'confirmed')
            .map(b => [b.id, b.customer_name])
        );
      }
    }

    const bookedCodeToName = new Map<string, string>();
    activeBookingSeats.forEach(bs => {
      const name = bookingNameMap.get(bs.booking_id);
      if (name) bookedCodeToName.set(bs.seat_code, name);
    });
    const bookedCodes = new Set(activeBookingSeats.map(bs => bs.seat_code));

    return layout.map(slot => {
      const status = bookedCodes.has(slot.seat_code)
        ? 'booked'
        : disabledCodes.has(slot.seat_code)
          ? 'disabled'
          : 'available';

      const seat: TripSeat = {
        id: `${tripId}:${slot.seat_code}`,
        trip_id: tripId,
        seat_code: slot.seat_code,
        deck: slot.deck,
        side: slot.side,
        status,
        row_num: slot.row_num,
        col_num: slot.col_num,
        price: priceOverrides.get(slot.seat_code) ?? trip.seat_price
      };

      if (status === 'booked') {
        const customer_name = bookedCodeToName.get(slot.seat_code);
        if (customer_name) seat.customer_name = customer_name;
      }

      return seat;
    });
  }

  public async disableSeat(tripId: string, seatCode: string | string[]): Promise<boolean> {
    const codes = Array.isArray(seatCode) ? seatCode : [seatCode];
    if (codes.length === 0) return true;

    const release = await this.lock();
    try {
      const seats = await this.getTripSeats(tripId);
      const targetSeats = seats.filter(s => codes.includes(s.seat_code));
      if (targetSeats.length === 0) return false;

      const booked = targetSeats.filter(s => s.status === 'booked');
      if (booked.length > 0) {
        throw new Error(`Cannot disable seat(s) ${booked.map(s => s.seat_code).join(', ')} that are already booked.`);
      }

      const codesToDisable = targetSeats.filter(s => s.status !== 'disabled').map(s => s.seat_code);
      if (codesToDisable.length === 0) return true;

      const now = new Date().toISOString();
      const newRows: DisabledSeat[] = codesToDisable.map(code => ({
        id: crypto.randomUUID(),
        trip_id: tripId,
        seat_code: code,
        disabled_at: now,
        disabled_by: 'admin-1'
      }));

      const log: TripLog = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        actor_type: 'admin',
        actor_id: 'admin-1',
        action: 'seat_disabled',
        seat_codes: codes,
        details: {},
        created_at: now
      };

      if (this.supabase) {
        try {
          const { error: insertError } = await this.supabase
            .from('disabled_seats')
            .insert(newRows);
          if (insertError) throw insertError;

          await this.supabase.from('trip_logs').insert(log);
          return true;
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase disableSeat error, falling back to local:', e.message);
        }
      }

      this.data.disabled_seats.push(...newRows);
      this.logAction(log);
      this.save();
      return true;
    } finally {
      release();
    }
  }

  public async enableSeat(tripId: string, seatCode: string | string[]): Promise<boolean> {
    const codes = Array.isArray(seatCode) ? seatCode : [seatCode];
    if (codes.length === 0) return true;

    const release = await this.lock();
    try {
      const log: TripLog = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        actor_type: 'admin',
        actor_id: 'admin-1',
        action: 'seat_enabled',
        seat_codes: codes,
        details: {},
        created_at: new Date().toISOString()
      };

      if (this.supabase) {
        try {
          const { error: deleteError } = await this.supabase
            .from('disabled_seats')
            .delete()
            .eq('trip_id', tripId)
            .in('seat_code', codes);
          if (deleteError) throw deleteError;

          await this.supabase.from('trip_logs').insert(log);
          return true;
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase enableSeat error, falling back to local:', e.message);
        }
      }

      const before = this.data.disabled_seats.length;
      this.data.disabled_seats = this.data.disabled_seats.filter(
        d => !(d.trip_id === tripId && codes.includes(d.seat_code))
      );
      const updatedAny = this.data.disabled_seats.length !== before;

      if (updatedAny) {
        this.logAction(log);
        this.save();
        return true;
      }
      return false;
    } finally {
      release();
    }
  }

  public async setSeatPrices(tripId: string, seatCode: string | string[], price: number, setBy: string | null = 'admin-1'): Promise<boolean> {
    const codes = Array.isArray(seatCode) ? seatCode : [seatCode];
    if (codes.length === 0) return true;
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Price must be a positive number.');
    }

    const release = await this.lock();
    try {
      const trip = await this.getTripById(tripId);
      if (!trip) return false;

      const layout = computeSeatLayout(trip.bus_model, trip.total_seats);
      const validCodes = new Set(layout.map(s => s.seat_code));
      const invalid = codes.filter(c => !validCodes.has(c));
      if (invalid.length > 0) {
        throw new Error(`Seat(s) ${invalid.join(', ')} do not exist on this trip.`);
      }

      const existingRows = await this.getSeatPriceOverrideRows(tripId);
      const { toDelete, toUpdate } = this.planSeatPriceOverrideSplit(existingRows, codes);

      const now = new Date().toISOString();
      const newRow: SeatPriceOverride = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        seat_codes: codes,
        price,
        set_at: now,
        set_by: setBy
      };

      const log: TripLog = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        actor_type: 'admin',
        actor_id: 'admin-1',
        action: 'seat_price_updated',
        seat_codes: codes,
        details: { price },
        created_at: now
      };

      if (this.supabase) {
        try {
          if (toDelete.length > 0) {
            const { error } = await this.supabase.from('seat_price_overrides').delete().in('id', toDelete);
            if (error) throw error;
          }
          for (const u of toUpdate) {
            const { error } = await this.supabase.from('seat_price_overrides').update({ seat_codes: u.seat_codes }).eq('id', u.id);
            if (error) throw error;
          }

          const { error: insertError } = await this.supabase.from('seat_price_overrides').insert(newRow);
          if (insertError) throw insertError;

          await this.supabase.from('trip_logs').insert(log);
          return true;
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase setSeatPrices error, falling back to local:', e.message);
        }
      }

      const deleteSet = new Set(toDelete);
      this.data.seat_price_overrides = this.data.seat_price_overrides
        .filter(o => !deleteSet.has(o.id))
        .map(o => {
          const u = toUpdate.find(x => x.id === o.id);
          return u ? { ...o, seat_codes: u.seat_codes } : o;
        });
      this.data.seat_price_overrides.push(newRow);

      this.logAction(log);
      this.save();
      return true;
    } finally {
      release();
    }
  }

  public async resetSeatPrices(tripId: string, seatCode: string | string[]): Promise<boolean> {
    const codes = Array.isArray(seatCode) ? seatCode : [seatCode];
    if (codes.length === 0) return true;

    const release = await this.lock();
    try {
      const existingRows = await this.getSeatPriceOverrideRows(tripId);
      const { toDelete, toUpdate } = this.planSeatPriceOverrideSplit(existingRows, codes);

      if (toDelete.length === 0 && toUpdate.length === 0) return false;

      const log: TripLog = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        actor_type: 'admin',
        actor_id: 'admin-1',
        action: 'seat_price_reset',
        seat_codes: codes,
        details: {},
        created_at: new Date().toISOString()
      };

      if (this.supabase) {
        try {
          if (toDelete.length > 0) {
            const { error } = await this.supabase.from('seat_price_overrides').delete().in('id', toDelete);
            if (error) throw error;
          }
          for (const u of toUpdate) {
            const { error } = await this.supabase.from('seat_price_overrides').update({ seat_codes: u.seat_codes }).eq('id', u.id);
            if (error) throw error;
          }

          await this.supabase.from('trip_logs').insert(log);
          return true;
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase resetSeatPrices error, falling back to local:', e.message);
        }
      }

      const deleteSet = new Set(toDelete);
      this.data.seat_price_overrides = this.data.seat_price_overrides
        .filter(o => !deleteSet.has(o.id))
        .map(o => {
          const u = toUpdate.find(x => x.id === o.id);
          return u ? { ...o, seat_codes: u.seat_codes } : o;
        });
      this.logAction(log);
      this.save();
      return true;
    } finally {
      release();
    }
  }

  // --- Booking operations ---
  public async getBookings(tripId: string): Promise<any[]> {
    if (this.supabase) {
      try {
        const { data: bookings, error: bError } = await this.supabase
          .from('bookings')
          .select('*')
          .eq('trip_id', tripId);
        if (bError) throw bError;

        if (!bookings || bookings.length === 0) return [];

        const bookingIds = bookings.map(b => b.id);
        const { data: bSeats, error: bsError } = await this.supabase
          .from('booking_seats')
          .select('*')
          .in('booking_id', bookingIds);
        if (bsError) throw bsError;

        const bSeatsGrouped = new Map<string, BookingSeat[]>();
        (bSeats || []).forEach(bs => {
          if (!bSeatsGrouped.has(bs.booking_id)) {
            bSeatsGrouped.set(bs.booking_id, []);
          }
          bSeatsGrouped.get(bs.booking_id)!.push(bs);
        });

        return bookings.map(b => {
          const seats_details = bSeatsGrouped.get(b.id) || [];
          const seat_codes = seats_details.map(sd => sd.seat_code);
          return {
            ...b,
            seat_codes,
            seats_details
          };
        });
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getBookings error, falling back to local:', e.message);
      }
    }

    const bookings = this.data.bookings.filter(b => b.trip_id === tripId);
    return bookings.map(b => {
      const seats_details = this.data.booking_seats.filter(bs => bs.booking_id === b.id);
      const seat_codes = seats_details.map(sd => sd.seat_code);
      return {
        ...b,
        seat_codes,
        seats_details
      };
    });
  }

  public async createBooking(
    tripId: string,
    customerName: string,
    mobileNumber: string | null,
    message: string | null,
    paymentScreenshotUrl: string | null,
    seatCodes: string[],
    bookingSource: BookingSource,
    adminOverrideAdvance?: number
  ): Promise<Booking> {
    const release = await this.lock();
    try {
      const trip = await this.getTripById(tripId);
      if (!trip) throw new Error('Trip not found');

      if (new Set(seatCodes).size !== seatCodes.length) {
        throw new Error('Duplicate seat selections are not allowed.');
      }

      const layout = computeSeatLayout(trip.bus_model, trip.total_seats);
      const validCodes = new Set(layout.map(s => s.seat_code));
      const missing = seatCodes.filter(code => !validCodes.has(code));
      if (missing.length > 0) {
        throw new Error('Some requested seats do not exist on this trip.');
      }

      const activeBookingSeats = await this.getActiveBookingSeatsForTrip(tripId);
      const bookedCodes = new Set(activeBookingSeats.map(bs => bs.seat_code));
      const disabledCodes = await this.getDisabledSeatCodes(tripId);
      const priceOverrides = await this.getSeatPriceOverrides(tripId);

      const unavailable = seatCodes.filter(code => bookedCodes.has(code) || disabledCodes.has(code));
      if (unavailable.length > 0) {
        throw new Error(`Seat(s) ${unavailable.join(', ')} are no longer available. Please choose different seats.`);
      }

      const bookingId = crypto.randomUUID();
      const now = new Date().toISOString();

      const advancePerSeat = adminOverrideAdvance !== undefined ? adminOverrideAdvance : trip.advance_per_seat;
      const advanceTotal = advancePerSeat * seatCodes.length;

      const newBooking: Booking = {
        id: bookingId,
        trip_id: tripId,
        customer_name: customerName,
        mobile_number: mobileNumber,
        message,
        payment_screenshot_url: paymentScreenshotUrl,
        advance_amount_total: advanceTotal,
        balance_amount_paid: 0,
        booking_source: bookingSource,
        payment_verified: bookingSource === 'admin',
        status: 'confirmed',
        created_at: now,
        cancelled_at: null,
        cancelled_by: null
      };

      const bookingSeats: BookingSeat[] = seatCodes.map(code => ({
        id: crypto.randomUUID(),
        booking_id: bookingId,
        trip_id: tripId,
        seat_code: code,
        advance_amount_for_seat: advancePerSeat,
        seat_price: priceOverrides.get(code) ?? trip.seat_price,
        active: true
      }));

      const log: TripLog = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        actor_type: bookingSource === 'admin' ? 'admin' : 'public',
        actor_id: bookingSource === 'admin' ? 'admin-1' : null,
        action: 'seat_booked',
        seat_codes: seatCodes,
        details: {
          customer_name: customerName,
          advance_amount: advanceTotal,
          source: bookingSource
        },
        created_at: now
      };

      if (this.supabase) {
        try {
          const { error: bookingError } = await this.supabase
            .from('bookings')
            .insert(newBooking);
          if (bookingError) throw bookingError;

          const { error: bsError } = await this.supabase
            .from('booking_seats')
            .insert(bookingSeats);
          if (bsError) {
            await this.supabase.from('bookings').delete().eq('id', bookingId);
            throw bsError;
          }

          await this.supabase.from('trip_logs').insert(log);
          return newBooking;
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase createBooking error, falling back to local:', e.message);
        }
      }

      this.data.booking_seats.push(...bookingSeats);
      this.data.bookings.push(newBooking);
      this.logAction(log);
      this.save();
      return newBooking;
    } finally {
      release();
    }
  }

  public async cancelBooking(bookingId: string, actorId: string | null = 'admin-1'): Promise<boolean> {
    let booking: Booking | null = null;
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .maybeSingle();
        if (error) throw error;
        booking = data;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase get booking for cancellation error, falling back to local:', e.message);
        booking = this.data.bookings.find(b => b.id === bookingId) || null;
      }
    } else {
      booking = this.data.bookings.find(b => b.id === bookingId) || null;
    }

    if (!booking) return false;
    if (booking.status === 'cancelled') return true;

    const now = new Date().toISOString();
    booking.status = 'cancelled';
    booking.cancelled_at = now;
    booking.cancelled_by = actorId;

    let bSeats: BookingSeat[] = [];
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('booking_seats')
          .select('*')
          .eq('booking_id', bookingId);
        if (error) throw error;
        bSeats = data || [];
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase get booking seats for cancellation error, falling back to local:', e.message);
        bSeats = this.data.booking_seats.filter(bs => bs.booking_id === bookingId);
      }
    } else {
      bSeats = this.data.booking_seats.filter(bs => bs.booking_id === bookingId);
    }

    const seatCodes = bSeats.map(bs => bs.seat_code);

    const log: TripLog = {
      id: crypto.randomUUID(),
      trip_id: booking.trip_id,
      actor_type: 'admin',
      actor_id: actorId,
      action: 'seat_unbooked',
      seat_codes: seatCodes,
      details: { customer_name: booking.customer_name },
      created_at: now
    };

    if (this.supabase) {
      try {
        const { error: bUpdateError } = await this.supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_at: now,
            cancelled_by: actorId
          })
          .eq('id', bookingId);
        if (bUpdateError) throw bUpdateError;

        const { error: seatsError } = await this.supabase
          .from('booking_seats')
          .update({ active: false })
          .eq('booking_id', bookingId);
        if (seatsError) throw seatsError;

        await this.supabase.from('trip_logs').insert(log);
        return true;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase cancelBooking error:', e.message);
        throw e;
      }
    }

    const localBooking = this.data.bookings.find(b => b.id === bookingId);
    if (localBooking) {
      localBooking.status = 'cancelled';
      localBooking.cancelled_at = now;
      localBooking.cancelled_by = actorId;

      this.data.booking_seats.forEach(bs => {
        if (bs.booking_id === bookingId) {
          bs.active = false;
        }
      });

      this.logAction(log);
      this.save();
      return true;
    }
    return false;
  }

  public async verifyPayment(bookingId: string, verified: boolean): Promise<boolean> {
    let booking: Booking | null = null;
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .maybeSingle();
        if (error) throw error;
        booking = data;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase get booking for verify error, falling back to local:', e.message);
        booking = this.data.bookings.find(b => b.id === bookingId) || null;
      }
    } else {
      booking = this.data.bookings.find(b => b.id === bookingId) || null;
    }

    if (!booking) return false;

    let bSeats: BookingSeat[] = [];
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('booking_seats')
          .select('*')
          .eq('booking_id', bookingId);
        if (error) throw error;
        bSeats = data || [];
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase get booking seats for verify error, falling back to local:', e.message);
        bSeats = this.data.booking_seats.filter(bs => bs.booking_id === bookingId);
      }
    } else {
      bSeats = this.data.booking_seats.filter(bs => bs.booking_id === bookingId);
    }
    const seatCodes = bSeats.map(bs => bs.seat_code);

    const log: TripLog = {
      id: crypto.randomUUID(),
      trip_id: booking.trip_id,
      actor_type: 'admin',
      actor_id: 'admin-1',
      action: verified ? 'payment_verified' : 'payment_unverified',
      seat_codes: seatCodes,
      details: { customer_name: booking.customer_name },
      created_at: new Date().toISOString()
    };

    if (this.supabase) {
      try {
        const { error: bUpdateError } = await this.supabase
          .from('bookings')
          .update({ payment_verified: verified })
          .eq('id', bookingId);
        if (bUpdateError) throw bUpdateError;

        await this.supabase.from('trip_logs').insert(log);
        return true;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase verifyPayment error, falling back to local:', e.message);
      }
    }

    const localBooking = this.data.bookings.find(b => b.id === bookingId);
    if (localBooking) {
      localBooking.payment_verified = verified;
      this.logAction(log);
      this.save();
      return true;
    }
    return false;
  }

  public async updateBookingBalance(bookingId: string, balanceAmountPaid: number): Promise<boolean> {
    let booking: Booking | null = null;
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .maybeSingle();
        if (error) throw error;
        booking = data;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase get booking for balance update error, falling back to local:', e.message);
        booking = this.data.bookings.find(b => b.id === bookingId) || null;
      }
    } else {
      booking = this.data.bookings.find(b => b.id === bookingId) || null;
    }

    if (!booking) return false;

    let bSeats: BookingSeat[] = [];
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('booking_seats')
          .select('*')
          .eq('booking_id', bookingId);
        if (error) throw error;
        bSeats = data || [];
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase get booking seats for balance update error, falling back to local:', e.message);
        bSeats = this.data.booking_seats.filter(bs => bs.booking_id === bookingId);
      }
    } else {
      bSeats = this.data.booking_seats.filter(bs => bs.booking_id === bookingId);
    }
    const seatCodes = bSeats.map(bs => bs.seat_code);

    const previousBalance = booking.balance_amount_paid;
    const amountCollected = balanceAmountPaid - previousBalance;

    const log: TripLog = {
      id: crypto.randomUUID(),
      trip_id: booking.trip_id,
      actor_type: 'admin',
      actor_id: 'admin-1',
      action: 'balance_updated',
      seat_codes: seatCodes,
      details: { customer_name: booking.customer_name, amount_collected: amountCollected, new_balance_amount_paid: balanceAmountPaid },
      created_at: new Date().toISOString()
    };

    if (this.supabase) {
      try {
        const { error: bUpdateError } = await this.supabase
          .from('bookings')
          .update({ balance_amount_paid: balanceAmountPaid })
          .eq('id', bookingId);
        if (bUpdateError) throw bUpdateError;

        await this.supabase.from('trip_logs').insert(log);
        return true;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase updateBookingBalance error, falling back to local:', e.message);
      }
    }

    const localBooking = this.data.bookings.find(b => b.id === bookingId);
    if (localBooking) {
      localBooking.balance_amount_paid = balanceAmountPaid;
      this.logAction(log);
      this.save();
      return true;
    }
    return false;
  }

  // --- Audit Logs ---
  public async getLogs(tripId: string): Promise<TripLog[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('trip_logs')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getLogs error, falling back to local:', e.message);
      }
    }
    return this.data.trip_logs
      .filter(l => l.trip_id === tripId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  private logAction(log: TripLog) {
    this.data.trip_logs.push(log);
  }

}
