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
  TripLog,
  BusModelType,
  TripStatus,
  SeatStatus,
  BookingSource,
  BookingStatus,
  ActorType
} from '../types.js';

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
  trip_seats: TripSeat[];
  bookings: Booking[];
  booking_seats: BookingSeat[];
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
  public_share_token text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_seats (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_code text NOT NULL,
  deck text NOT NULL,
  side text NOT NULL,
  status text NOT NULL,
  row_num integer NOT NULL,
  col_num integer NOT NULL,
  UNIQUE(trip_id, seat_code)
);

CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  mobile_number text,
  message text,
  payment_screenshot_url text,
  advance_amount_total integer NOT NULL,
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
  trip_seat_id text NOT NULL REFERENCES trip_seats(id) ON DELETE CASCADE,
  advance_amount_for_seat integer NOT NULL,
  seat_code text NOT NULL
);

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

-- Seed default data
INSERT INTO admins (id, name, login_key_hash)
VALUES ('admin-1', 'Jain Tours Admin', '240751c360cf044031d77a06f3661eb5501dc0e6e73cb51e39a77f98ee09a47c')
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_settings (id, company_name, tagline, logo_url, header_image_url)
VALUES ('singleton', 'Jain Tours & Travel', 'श्री महावीराय नमः', '', '')
ON CONFLICT (id) DO NOTHING;
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
        return JSON.parse(content);
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
      trip_seats: [],
      bookings: [],
      booking_seats: [],
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
        if (data) return data;
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

    const seats = this.generateSeatsForTrip(id, newTrip.bus_model, newTrip.total_seats);

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

        const { error: seatsError } = await this.supabase
          .from('trip_seats')
          .insert(seats);
        if (seatsError) throw seatsError;

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
    this.data.trip_seats.push(...seats);
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

    let hasBookings = false;
    if (this.supabase) {
      try {
        const { count, error } = await this.supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('trip_id', id)
          .eq('status', 'confirmed');
        if (error) throw error;
        hasBookings = (count || 0) > 0;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase count bookings error, falling back to local count:', e.message);
        hasBookings = this.data.bookings.some(b => b.trip_id === id && b.status === 'confirmed');
      }
    } else {
      hasBookings = this.data.bookings.some(b => b.trip_id === id && b.status === 'confirmed');
    }

    let regeneratedSeats: TripSeat[] | null = null;
    const modelChanged = updates.bus_model && updates.bus_model !== original.bus_model;
    const totalChanged = updates.total_seats && updates.total_seats !== original.total_seats;

    if (modelChanged || totalChanged) {
      if (hasBookings) {
        throw new Error('Cannot change bus model or capacity because active bookings already exist on this trip.');
      } else {
        regeneratedSeats = this.generateSeatsForTrip(id, updatedTrip.bus_model, updatedTrip.total_seats);
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

        if (regeneratedSeats) {
          const { error: delError } = await this.supabase
            .from('trip_seats')
            .delete()
            .eq('trip_id', id);
          if (delError) throw delError;

          const { error: insError } = await this.supabase
            .from('trip_seats')
            .insert(regeneratedSeats);
          if (insError) throw insError;
        }

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
      if (regeneratedSeats) {
        this.data.trip_seats = this.data.trip_seats.filter(s => s.trip_id !== id);
        this.data.trip_seats.push(...regeneratedSeats);
      }
      this.logAction(log);
      this.save();
    }
    return updatedTrip;
  }

  // --- Seat operations ---
  public async getTripSeats(tripId: string): Promise<TripSeat[]> {
    if (this.supabase) {
      try {
        const { data: seats, error: seatsError } = await this.supabase
          .from('trip_seats')
          .select('*')
          .eq('trip_id', tripId);
        if (seatsError) throw seatsError;

        const { data: bookings, error: bookingsError } = await this.supabase
          .from('bookings')
          .select('id, customer_name')
          .eq('trip_id', tripId)
          .eq('status', 'confirmed');
        if (bookingsError) throw bookingsError;

        const bookingIds = (bookings || []).map(b => b.id);

        let bookingSeats: BookingSeat[] = [];
        if (bookingIds.length > 0) {
          const { data: bSeats, error: bsError } = await this.supabase
            .from('booking_seats')
            .select('*')
            .in('booking_id', bookingIds);
          if (bsError) throw bsError;
          bookingSeats = bSeats || [];
        }

        const bookingMap = new Map((bookings || []).map(b => [b.id, b.customer_name]));
        const seatToBookingMap = new Map(bookingSeats.map(bs => [bs.trip_seat_id, bs.booking_id]));

        return (seats || []).map(seat => {
          if (seat.status === 'booked') {
            const bookingId = seatToBookingMap.get(seat.id);
            if (bookingId) {
              const customer_name = bookingMap.get(bookingId);
              if (customer_name) {
                return {
                  ...seat,
                  customer_name
                };
              }
            }
          }
          return seat;
        });
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase getTripSeats error, falling back to local:', e.message);
      }
    }

    const seats = this.data.trip_seats.filter(s => s.trip_id === tripId);
    return seats.map(seat => {
      if (seat.status === 'booked') {
        const bookingSeat = this.data.booking_seats.find(bs => bs.trip_seat_id === seat.id);
        if (bookingSeat) {
          const booking = this.data.bookings.find(b => b.id === bookingSeat.booking_id && b.status === 'confirmed');
          if (booking) {
            return {
              ...seat,
              customer_name: booking.customer_name
            };
          }
        }
      }
      return seat;
    });
  }

  public async disableSeat(tripId: string, seatCode: string | string[]): Promise<boolean> {
    const codes = Array.isArray(seatCode) ? seatCode : [seatCode];
    if (codes.length === 0) return true;

    const seats = await this.getTripSeats(tripId);
    const targetSeats = seats.filter(s => codes.includes(s.seat_code));
    if (targetSeats.length === 0) return false;

    const booked = targetSeats.filter(s => s.status === 'booked');
    if (booked.length > 0) {
      throw new Error(`Cannot disable seat(s) ${booked.map(s => s.seat_code).join(', ')} that are already booked.`);
    }

    const log: TripLog = {
      id: crypto.randomUUID(),
      trip_id: tripId,
      actor_type: 'admin',
      actor_id: 'admin-1',
      action: 'seat_disabled',
      seat_codes: codes,
      details: {},
      created_at: new Date().toISOString()
    };

    if (this.supabase) {
      try {
        const { error: updateError } = await this.supabase
          .from('trip_seats')
          .update({ status: 'disabled' })
          .eq('trip_id', tripId)
          .in('seat_code', codes);
        if (updateError) throw updateError;

        await this.supabase.from('trip_logs').insert(log);
        return true;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase disableSeat error, falling back to local:', e.message);
      }
    }

    let updatedAny = false;
    this.data.trip_seats.forEach(s => {
      if (s.trip_id === tripId && codes.includes(s.seat_code)) {
        s.status = 'disabled';
        updatedAny = true;
      }
    });

    if (updatedAny) {
      this.logAction(log);
      this.save();
      return true;
    }
    return false;
  }

  public async enableSeat(tripId: string, seatCode: string | string[]): Promise<boolean> {
    const codes = Array.isArray(seatCode) ? seatCode : [seatCode];
    if (codes.length === 0) return true;

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
        const { error: updateError } = await this.supabase
          .from('trip_seats')
          .update({ status: 'available' })
          .eq('trip_id', tripId)
          .in('seat_code', codes);
        if (updateError) throw updateError;

        await this.supabase.from('trip_logs').insert(log);
        return true;
      } catch (e: any) {
        console.error('[Bus-Seat-App] Supabase enableSeat error, falling back to local:', e.message);
      }
    }

    let updatedAny = false;
    this.data.trip_seats.forEach(s => {
      if (s.trip_id === tripId && codes.includes(s.seat_code)) {
        s.status = 'available';
        updatedAny = true;
      }
    });

    if (updatedAny) {
      this.logAction(log);
      this.save();
      return true;
    }
    return false;
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

      let requestedSeats: TripSeat[] = [];
      if (this.supabase) {
        try {
          const { data, error } = await this.supabase
            .from('trip_seats')
            .select('*')
            .eq('trip_id', tripId)
            .in('seat_code', seatCodes);
          if (error) throw error;
          requestedSeats = data || [];
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase get requested seats error, falling back to local:', e.message);
          requestedSeats = this.data.trip_seats.filter(
            s => s.trip_id === tripId && seatCodes.includes(s.seat_code)
          );
        }
      } else {
        requestedSeats = this.data.trip_seats.filter(
          s => s.trip_id === tripId && seatCodes.includes(s.seat_code)
        );
      }

      if (requestedSeats.length !== seatCodes.length) {
        throw new Error('Some requested seats do not exist on this trip.');
      }

      const unavailable = requestedSeats.filter(s => s.status !== 'available');
      if (unavailable.length > 0) {
        const codes = unavailable.map(s => s.seat_code).join(', ');
        throw new Error(`Seat(s) ${codes} are no longer available. Please choose different seats.`);
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
        booking_source: bookingSource,
        payment_verified: bookingSource === 'admin',
        status: 'confirmed',
        created_at: now,
        cancelled_at: null,
        cancelled_by: null
      };

      const bookingSeats: BookingSeat[] = requestedSeats.map(seat => {
        return {
          id: crypto.randomUUID(),
          booking_id: bookingId,
          trip_seat_id: seat.id,
          advance_amount_for_seat: advancePerSeat,
          seat_code: seat.seat_code
        };
      });

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
          const seatIds = requestedSeats.map(s => s.id);
          const { error: seatsError } = await this.supabase
            .from('trip_seats')
            .update({ status: 'booked' })
            .in('id', seatIds);
          if (seatsError) throw seatsError;

          const { error: bookingError } = await this.supabase
            .from('bookings')
            .insert(newBooking);
          if (bookingError) {
            await this.supabase.from('trip_seats').update({ status: 'available' }).in('id', seatIds);
            throw bookingError;
          }

          const { error: bsError } = await this.supabase
            .from('booking_seats')
            .insert(bookingSeats);
          if (bsError) {
            await this.supabase.from('bookings').delete().eq('id', bookingId);
            await this.supabase.from('trip_seats').update({ status: 'available' }).in('id', seatIds);
            throw bsError;
          }

          await this.supabase.from('trip_logs').insert(log);
          return newBooking;
        } catch (e: any) {
          console.error('[Bus-Seat-App] Supabase createBooking error, falling back to local:', e.message);
        }
      }

      requestedSeats.forEach(seat => {
        seat.status = 'booked';
      });
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

    const seatIds = bSeats.map(bs => bs.trip_seat_id);
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

        if (seatIds.length > 0) {
          const { error: seatsError } = await this.supabase
            .from('trip_seats')
            .update({ status: 'available' })
            .in('id', seatIds);
          if (seatsError) throw seatsError;
        }

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

      this.data.trip_seats.forEach(s => {
        if (seatIds.includes(s.id)) {
          s.status = 'available';
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

  // --- Internal seat generator layout template mapping ---
  private generateSeatsForTrip(tripId: string, busModel: BusModelType, totalSeats: number): TripSeat[] {
    const seats: TripSeat[] = [];
    let seatIdCounter = 1;

    if (busModel === '2x2_sitting') {
      const seatsPerRow = 4;
      const numRows = Math.ceil(totalSeats / seatsPerRow);
      let seatsRemaining = totalSeats;

      for (let r = 1; r <= numRows; r++) {
        const cols = [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'right' as const, code: 'C', col: 3 },
          { side: 'right' as const, code: 'D', col: 4 }
        ];

        for (const col of cols) {
          if (seatsRemaining > 0) {
            seats.push({
              id: `seat-${tripId}-${seatIdCounter++}`,
              trip_id: tripId,
              seat_code: `${r}${col.code}`,
              deck: 'main',
              side: col.side,
              status: 'available',
              row_num: r,
              col_num: col.col
            });
            seatsRemaining--;
          }
        }
      }
    } else if (busModel === '2x3_sitting') {
      const seatsPerRow = 5;
      const numRows = Math.ceil(totalSeats / seatsPerRow);
      let seatsRemaining = totalSeats;

      for (let r = 1; r <= numRows; r++) {
        const cols = [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'right' as const, code: 'C', col: 3 },
          { side: 'right' as const, code: 'D', col: 4 },
          { side: 'right' as const, code: 'E', col: 5 }
        ];

        for (const col of cols) {
          if (seatsRemaining > 0) {
            seats.push({
              id: `seat-${tripId}-${seatIdCounter++}`,
              trip_id: tripId,
              seat_code: `${r}${col.code}`,
              deck: 'main',
              side: col.side,
              status: 'available',
              row_num: r,
              col_num: col.col
            });
            seatsRemaining--;
          }
        }
      }
    } else if (busModel === '2x2_sleeper') {
      const seatsPerDeck = Math.ceil(totalSeats / 2);
      
      let lowerRemaining = seatsPerDeck;
      for (let r = 1; r <= 6; r++) {
        const cols = r === 6 ? [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'left' as const, code: 'M', col: 2 },
          { side: 'right' as const, code: 'C', col: 3 },
          { side: 'right' as const, code: 'D', col: 4 }
        ] : [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'right' as const, code: 'C', col: 3 },
          { side: 'right' as const, code: 'D', col: 4 }
        ];

        for (const col of cols) {
          if (lowerRemaining > 0) {
            seats.push({
              id: `seat-${tripId}-${seatIdCounter++}`,
              trip_id: tripId,
              seat_code: `L-${r}${col.code}`,
              deck: 'lower',
              side: col.side,
              status: 'available',
              row_num: r,
              col_num: col.col
            });
            lowerRemaining--;
          }
        }
      }

      let upperRemaining = totalSeats - seats.length;
      for (let r = 1; r <= 6; r++) {
        const cols = r === 6 ? [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'left' as const, code: 'M', col: 2 },
          { side: 'right' as const, code: 'C', col: 3 },
          { side: 'right' as const, code: 'D', col: 4 }
        ] : [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'right' as const, code: 'C', col: 3 },
          { side: 'right' as const, code: 'D', col: 4 }
        ];

        for (const col of cols) {
          if (upperRemaining > 0) {
            seats.push({
              id: `seat-${tripId}-${seatIdCounter++}`,
              trip_id: tripId,
              seat_code: `U-${r}${col.code}`,
              deck: 'upper',
              side: col.side,
              status: 'available',
              row_num: r,
              col_num: col.col
            });
            upperRemaining--;
          }
        }
      }
    } else if (busModel === '2x1_sleeper') {
      const seatsPerDeck = Math.ceil(totalSeats / 2);
      const sleepersPerRow = 3;
      
      let lowerRemaining = seatsPerDeck;
      const lowerRows = Math.ceil(seatsPerDeck / sleepersPerRow);
      for (let r = 1; r <= lowerRows; r++) {
        const cols = [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'right' as const, code: 'C', col: 3 }
        ];

        for (const col of cols) {
          if (lowerRemaining > 0) {
            seats.push({
              id: `seat-${tripId}-${seatIdCounter++}`,
              trip_id: tripId,
              seat_code: `L-${r}${col.code}`,
              deck: 'lower',
              side: col.side,
              status: 'available',
              row_num: r,
              col_num: col.col
            });
            lowerRemaining--;
          }
        }
      }

      let upperRemaining = totalSeats - seats.length;
      const upperRows = Math.ceil(upperRemaining / sleepersPerRow);
      for (let r = 1; r <= upperRows; r++) {
        const cols = [
          { side: 'left' as const, code: 'A', col: 0 },
          { side: 'left' as const, code: 'B', col: 1 },
          { side: 'right' as const, code: 'C', col: 3 }
        ];

        for (const col of cols) {
          if (upperRemaining > 0) {
            seats.push({
              id: `seat-${tripId}-${seatIdCounter++}`,
              trip_id: tripId,
              seat_code: `U-${r}${col.code}`,
              deck: 'upper',
              side: col.side,
              status: 'available',
              row_num: r,
              col_num: col.col
            });
            upperRemaining--;
          }
        }
      }
    }

    return seats;
  }
}
