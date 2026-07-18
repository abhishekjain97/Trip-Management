/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BusModelType = '2x2_sitting' | '2x3_sitting' | '2x2_sleeper' | '2x1_sleeper';
export type TripStatus = 'active' | 'completed' | 'cancelled';
export type SeatStatus = 'available' | 'booked' | 'disabled';
export type BookingSource = 'admin' | 'public';
export type BookingStatus = 'confirmed' | 'cancelled';
export type ActorType = 'admin' | 'public' | 'system';

export interface CompanySettings {
  company_name: string;
  tagline: string;
  logo_url: string;
  header_image_url: string;
}

export interface Trip {
  id: string;
  title: string;
  trip_date: string;
  bus_model: BusModelType;
  total_seats: number;
  seat_price: number;
  advance_per_seat: number;
  description: string;
  qr_code_url: string | null;
  status: TripStatus;
  public_share_token: string;
  created_at: string;
  updated_at: string;
}

export interface TripSeat {
  id: string;
  trip_id: string;
  seat_code: string;
  deck: 'upper' | 'lower' | 'main';
  side: 'left' | 'right' | 'center';
  status: SeatStatus;
  row_num: number; // For rendering layout rows
  col_num: number; // For layout columns
  customer_name?: string; // Cache for easy rendering on chart (optional)
}

export interface Booking {
  id: string;
  trip_id: string;
  customer_name: string;
  mobile_number: string | null;
  message: string | null;
  payment_screenshot_url: string | null;
  advance_amount_total: number;
  booking_source: BookingSource;
  payment_verified: boolean;
  status: BookingStatus;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
}

export interface BookingSeat {
  id: string;
  booking_id: string;
  trip_seat_id: string;
  advance_amount_for_seat: number;
  seat_code: string; // Helper for easy lists
}

export interface TripLog {
  id: string;
  trip_id: string;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  seat_codes: string[] | null;
  details: any;
  created_at: string;
}

// Full Trip details including seats and bookings, used in admin detail view
export interface TripDetailsResponse {
  trip: Trip;
  seats: TripSeat[];
  bookings: (Booking & { seat_codes: string[]; seats_details: BookingSeat[] })[];
  logs: TripLog[];
  company: CompanySettings;
}
