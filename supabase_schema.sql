-- ============================================================================
-- Jain Tours & Travel — Bus Seat Booking App
-- Full Supabase/Postgres schema
--
-- Run this once in the Supabase SQL Editor to create every table the app
-- needs from scratch. Safe to re-run (every statement is idempotent).
--
-- This mirrors the DDL embedded in src/server/db.ts (printed to the console
-- on server startup when SUPABASE_URL/SUPABASE_ANON_KEY are set) — keep the
-- two in sync if the schema changes again.
-- ============================================================================

-- Singleton row holding branding/company info shown across the app.
CREATE TABLE IF NOT EXISTS company_settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  company_name text NOT NULL,
  tagline text NOT NULL,
  logo_url text NOT NULL,
  header_image_url text NOT NULL
);

-- Admin accounts. login_key_hash is a sha256 hash of the plaintext access key.
CREATE TABLE IF NOT EXISTS admins (
  id text PRIMARY KEY,
  name text NOT NULL,
  login_key_hash text NOT NULL
);

-- A single bus trip/route. Seats are NOT stored here or in their own table —
-- they're computed on demand from bus_model + total_seats (see
-- src/server/seatLayout.ts). Only bookings, blocks, and price overrides for
-- specific seat codes are persisted (see tables below).
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

-- One row per reservation (a group of seats booked together by one customer).
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

-- One row per seat within a booking. `active` mirrors the parent booking's
-- status ('confirmed' => true, 'cancelled' => false) and is what the DB-level
-- unique index below actually enforces against — it's kept in sync by the app
-- rather than derived via a join, since a partial index predicate can only
-- reference columns on the same table. `seat_price` snapshots the ticket
-- price that applied to this seat at booking time (independent of any later
-- change to trips.seat_price or seat_price_overrides).
CREATE TABLE IF NOT EXISTS booking_seats (
  id text PRIMARY KEY,
  booking_id text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_code text NOT NULL,
  advance_amount_for_seat integer NOT NULL,
  seat_price integer,
  active boolean NOT NULL DEFAULT true
);

-- Guarantees at most one *active* booking per seat per trip — the DB-level
-- double-booking guard (the app also serializes booking writes in-process
-- via a mutex, but that alone doesn't help across multiple server instances).
CREATE UNIQUE INDEX IF NOT EXISTS booking_seats_active_seat_uq
  ON booking_seats(trip_id, seat_code) WHERE active;

-- Seats an admin has manually blocked/disabled for a trip. Presence of a row
-- here (for a given trip_id + seat_code) means that seat is unavailable for
-- booking regardless of what booking_seats says.
CREATE TABLE IF NOT EXISTS disabled_seats (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_code text NOT NULL,
  disabled_at text NOT NULL,
  disabled_by text,
  UNIQUE(trip_id, seat_code)
);

-- Per-seat ticket price overrides. Each row represents one "apply this price
-- to this batch of seats" admin action — seat_codes is an array covering
-- every seat that action touched, rather than one row per seat, to avoid
-- redundant rows when many seats share a price. A seat_code should only
-- appear in at most one row per trip at a time; the app enforces this by
-- always splitting a seat out of its previous row before writing a new one.
-- Seats with no matching row here just use trips.seat_price.
CREATE TABLE IF NOT EXISTS seat_price_overrides (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_codes text[] NOT NULL,
  price integer NOT NULL,
  set_at text NOT NULL,
  set_by text
);

CREATE INDEX IF NOT EXISTS seat_price_overrides_trip_idx ON seat_price_overrides(trip_id);

-- Audit trail of every admin/public/system action taken on a trip (trip
-- created/updated, seats booked/unbooked/disabled/enabled/re-priced, payment
-- verified, balance updated, etc.) — shown in the trip detail page's
-- Activity Log panel.
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
