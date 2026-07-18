# Product Requirements Document
## Bus Seat Reservation & Booking Management App

**Version:** 1.0 (Draft)
**Prepared:** July 2026
**Reference design:** Jain Tours & Travel seat chart (uploaded screenshot)

---

## 1. Overview

A mobile-friendly web application for bus/tour operators to manage trip creation, seat inventory, and customer bookings — with an **Admin Panel** for the operator and a **public, login-free Booking Page** shared with customers via a link.

The core visual centerpiece is a **bus seat chart** (sitting or sleeper layout) styled after the reference screenshot: yellow seat-number badges, black borders, white cards, company header branding, with the **driver on the right and entrance on the left** (India-standard right-hand-drive layout).

---

## 2. Goals

- Let an operator create a trip in under a minute and immediately get a shareable booking link.
- Replace manual seat-chart bookkeeping (spreadsheets / printed charts) with a live, conflict-free digital seat map.
- Prevent double-booking of a seat even under simultaneous requests.
- Give the operator a running financial picture of each trip (capacity value, advance collected, balance due).
- Let customers self-book seats without an account, upload payment proof, and see real-time seat availability.
- Keep a full audit trail of who booked, disabled, or cancelled every seat.

---

## 3. Users & Roles

| Role | Access | Auth |
|---|---|---|
| **Admin** | Full app: create/edit trips, manage seats, verify payments, view logs, export PDF | Single access-key login (no username/password flow needed, but field supports it) |
| **Customer / User** | Public trip link only: view trip details, seat chart, book available seats, upload payment screenshot | No login — access via unique shareable trip URL |

---

## 4. Assumptions & Clarifications

Since a few requirements overlapped or were ambiguous, these defaults are assumed. Flag any you'd like changed:

1. **"Advance one-seat price" = "advance per-seat price."** These are treated as a single field: `advance_per_seat`, set once at trip creation and reused everywhere (trip summary, customer-side booking calculation).
2. **Advance amount is fixed for customers, editable for admin.** When a customer books via the public link, advance = `advance_per_seat × seats selected` (not editable). When the admin books manually (e.g., cash collected on the spot, phone booking), the admin can override the advance amount per seat, since real collected cash may differ.
3. **Seat popup privacy:** Clicking a booked seat shows customer name + phone to the **Admin**. On the **public page**, a booked seat just shows "Booked" (no personal data) to protect customer privacy. This can be toggled off if you'd prefer full transparency to all viewers.
4. **Single operator (single-tenant).** The app is built for one operator/company (e.g., Jain Tours & Travel) with one configurable company profile (name, logo, header image) reused across all trips and PDF exports. Multi-operator support is listed under Future Scope.
5. **Seat layout is template-driven.** Each bus model has a standard layout template (column/deck structure matching the screenshot). Entering "number of seats" fits seats into that template (extra/short rows handled automatically, e.g. the odd `M-1` middle seat in the reference chart); admin can hand-adjust afterward using seat disable/enable.

---

## 5. Functional Requirements

### 5.1 Admin Authentication
- Single login screen with an **"Admin Login"** action.
- Admin enters an **access key** (a secret string) — no separate username/password required, though the schema supports adding one later.
- Key is validated server-side (hashed comparison) and issues a session token (JWT / Supabase session).
- Failed attempts are rate-limited.

### 5.2 Trip Management (Admin)
**Create Trip** form fields:

| Field | Type | Notes |
|---|---|---|
| Trip Title | text | e.g. "Delhi → Manali – Diwali Special" |
| Trip Date | date | |
| Bus Model | select | `2x2_sitting`, `2x3_sitting`, `2x2_sleeper`, `2x1_sleeper` |
| Number of Seats | number | Fitted into the bus model's layout template |
| Total Seat Price | currency | Full ticket price per seat |
| Advance per Seat | currency | Fixed advance required per seat (see §4.2) |
| Description | rich text (WYSIWYG editor) | Shown on trip detail & public page; supports bold/lists/links |
| QR Code Image | image upload | Optional at creation, can be added later |

On save: the trip is created with `status = active`, a **unique public share token** is generated, and the seat chart is generated from the bus-model template.

**Trip Detail Page (Admin)** shows:
- Title, date, bus model, description (rendered rich text)
- **Financial summary panel:**
  - Total Capacity Value = `total_seats × seat_price`
  - Total Advance Collected = Σ advance amounts of all confirmed bookings
  - Balance Due (on booked seats) = `(booked_seats × seat_price) − advance_collected`
  - Seats booked / available / disabled counts
- QR code image (with **Download** button)
- **"Copy Trip Link"** button → copies the public booking URL to clipboard
- **"Export PDF"** button → exports the seat chart with company header (see §5.11)
- Full seat chart (see §5.3)
- Bookings list (name, phone, seats, advance, screenshot thumbnail, verified toggle)
- Activity log for the trip

### 5.3 Bus Models & Seat Chart Rendering
Two chart types depending on bus model:

- **Sleeper (`2x2_sleeper`, `2x1_sleeper`):** two stacked decks — **Upper Deck** chart and **Lower Deck** chart, toggle/tab between them, matching the reference screenshot's column structure (Upper-Left / Lower-Left / Lower-Right / Upper-Right, with an odd extra berth like `M-1` where needed).
- **Sitting (`2x2_sitting`, `2x3_sitting`):** a single chart, rows of 2+2 or 2+3 seats with center aisle.
- In all layouts: **Driver icon top-right**, **Entrance marker top-left** (India RHD standard), per your requirement.
- Seat cell: yellow badge with seat code (e.g. `U-1`, `L-3`), white body. If booked, customer name shown inside the cell (as in the reference screenshot).

**Seat states (color-coded):**

| State | Appearance |
|---|---|
| Available | White cell, yellow badge, seat code only |
| Selected (in progress, not yet saved) | Highlighted border/fill |
| Booked | Filled cell showing customer name |
| Disabled/Blocked (admin) | Greyed out, "Not Available" |

### 5.4 Seat Booking — Admin Side
- Admin clicks an available seat (supports multi-select).
- Modal opens to enter: Customer Name, Mobile Number (optional), Advance Amount per seat (editable, defaults to trip's `advance_per_seat`), optional note.
- On save: seat(s) move to `booked`, tied to one `booking` record with all selected seats.
- Admin can click a booked seat → popup with name, phone, advance paid, screenshot (if any), and **Unbook** action.

### 5.5 Public Booking Page (Customer)
- Reached via the unique share URL (no login).
- Shows: title, date, description, bus model, seat price, advance per seat, QR code (view + download), seat chart.
- Customer selects one or more **available** seats only (booked/disabled seats are visually disabled and unselectable).
- A running summary shows: seats selected, advance due = `advance_per_seat × seats selected` (read-only, not editable by customer).
- Booking form: Name (required), Mobile Number (optional), Message/Note (optional), Payment Screenshot upload (optional at submit, required before admin verification).
- On submit → seats are validated and locked (see §5.6) → confirmation shown → seats now show as booked to all future visitors.

### 5.6 Concurrency & Seat-Locking (Critical)
To prevent two people booking the same seat simultaneously:
- Booking is processed as a **single database transaction**.
- All requested seats are re-checked with a row lock (`SELECT ... FOR UPDATE`) immediately before insert.
- If **any** requested seat is no longer `available` (booked/disabled by someone else in the meantime), the **entire transaction is rolled back** — no partial bookings.
- The user is shown an error modal: *"Seat(s) X, Y are no longer available. Please choose different seats."* Chart refreshes to the current live state.
- A unique partial index on `(trip_seat_id)` where booking is active guarantees this at the DB level as a second line of defense, independent of application logic.

### 5.7 Payment: QR Code & Screenshot Upload
- Admin can upload one QR code image (e.g., PhonePe/UPI QR) per trip, shown on both admin and public trip pages, downloadable.
- Customers can attach a payment screenshot at time of booking.
- Admin sees a thumbnail per booking and can mark **Payment Verified** (boolean flag, doesn't block the booking itself, just an internal checklist for the admin).

### 5.8 Seat Management (Admin)
- **Disable seat:** marks a seat `disabled` (e.g., broken seat, reserved for staff) — shown as unavailable to customers, cannot be booked, but doesn't require a customer record.
- **Enable seat:** reverts a disabled seat back to `available`.
- **Unbook / Cancel booking:** admin can cancel an existing booking; its seats return to `available`. The booking record is kept with `status = cancelled` for history (not deleted) and logged.

### 5.9 Audit Log
Every state-changing action is recorded: trip created/edited, seat booked, seat unbooked/cancelled, seat disabled/enabled, payment verified, QR uploaded — with actor (admin or "public booking"), timestamp, and details. Visible on the trip detail page as an activity feed.

### 5.10 PDF Export
- Exports the current seat chart (upper + lower deck for sleepers, or the single chart for sitting buses) to PDF.
- Uses the **same header/branding** as the app's live chart — company logo, bus icon, tagline, trip title & date — so the exported PDF visually matches the reference screenshot.
- Includes booked seat names, same color coding, printable for the driver/conductor to carry physically.

---

## 6. Non-Functional Requirements

- **Mobile-first responsive design** — usable on phones for both admin and customers (this is explicitly required to "run on mobile as well").
- **Performance:** seat chart should reflect availability changes without manual refresh where feasible (real-time subscription via Supabase Realtime recommended).
- **Security:** admin key stored hashed; public trip links are unguessable (random token, not sequential trip IDs); rate-limiting on booking submissions to deter abuse/spam.
- **Data integrity:** no seat can ever belong to two active bookings (enforced at DB level, not just app level).
- **Accessibility:** color-coded seat states also carry text/label differences, not color alone.

---

## 7. Information Architecture

```
/admin/login                      → Admin key login
/admin/trips                      → Trip list (dashboard)
/admin/trips/new                  → Create trip
/admin/trips/:id                  → Trip detail (summary, chart, bookings, logs, QR, export)
/admin/settings                   → Company profile (logo, header, tagline) for branding reuse

/trip/:shareToken                 → Public booking page (no login)
```

---

## 8. User Flows

**Admin — Create & Manage a Trip**
1. Log in with access key → Trip dashboard
2. "New Trip" → fill title, date, bus model, seats, prices, description → Save
3. Land on Trip Detail → upload QR code → copy public link → share with customers
4. As bookings roll in (via public link or manual admin entry), monitor chart, verify payments, adjust seats as needed
5. Export PDF chart for the driver/conductor before departure

**Customer — Book a Seat**
1. Open shared link → view trip info, price, advance, chart
2. Tap available seat(s) → see advance due update live
3. Enter name, optional phone, optional note → optionally attach payment screenshot → Submit
4. System validates seats are still free → confirms booking → seats now show booked

**Concurrency Failure Path**
1. Two customers select the same seat within seconds of each other
2. First submission locks and books the seat
3. Second submission's transaction re-validation fails → error modal shown → chart refreshes → customer picks another seat

---

## 9. Seat Layout Configuration (Data-Driven Chart)

Each bus model maps to a JSON layout template so the chart renders consistently and matches the reference design (driver top-right, entrance top-left).

```json
{
  "bus_model": "2x2_sleeper",
  "driver_position": "top-right",
  "entrance_position": "top-left",
  "decks": [
    {
      "deck": "upper",
      "columns": [
        { "side": "left",  "label": "UPPER", "seat_codes": ["U-1","U-2","U-3","U-4","U-5","U-6"] },
        { "side": "right", "label": "UPPER", "seat_codes": ["U-1","U-2","U-3","U-4","U-5","U-6"] }
      ]
    },
    {
      "deck": "lower",
      "columns": [
        { "side": "left",  "label": "LOWER", "seat_codes": ["L-1","L-2","L-3","L-4","L-5","L-6"] },
        { "side": "right", "label": "LOWER", "seat_codes": ["L-1","L-2","L-3","L-4","L-5","L-6"] }
      ],
      "extra_seats": [
        { "seat_code": "M-1", "position": "bottom-center-left" }
      ]
    }
  ]
}
```

For sitting buses (`2x2_sitting` / `2x3_sitting`), a single `deck: "main"` with `columns` of 2 or 3 seats per row is used instead of two decks.

This JSON is stored per trip (generated from a base template at trip creation, then adjustable) so each seat's position on the chart and its seat code are consistent between the live chart, the booking logic, and the PDF export.

---

## 10. Database Schema (Supabase / PostgreSQL)

### 10.1 `admins`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| name | text | not null |
| login_key_hash | text | not null, unique |
| created_at | timestamptz | default `now()` |

### 10.2 `company_settings`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| company_name | text | e.g. "Jain Tours & Travel" |
| tagline | text | e.g. "श्री महावीराय नमः" |
| logo_url | text | |
| header_image_url | text | reused in-app and in PDF export |
| updated_at | timestamptz | |

### 10.3 `trips`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| title | text | not null |
| trip_date | date | not null |
| bus_model | text | enum: `2x2_sitting`,`2x3_sitting`,`2x2_sleeper`,`2x1_sleeper` |
| total_seats | int | not null |
| seat_price | numeric(10,2) | total price per seat |
| advance_per_seat | numeric(10,2) | fixed advance per seat |
| description | text | rich text / HTML from editor |
| layout_json | jsonb | generated seat-map (see §9) |
| qr_code_url | text | nullable |
| status | text | enum: `draft`,`active`,`completed`,`cancelled` |
| public_share_token | text | unique, indexed |
| created_by | uuid | FK → admins.id |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | |

### 10.4 `trip_seats`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| trip_id | uuid | FK → trips.id |
| seat_code | text | e.g. `U-1`, `L-3`, `M-1` |
| deck | text | enum: `upper`,`lower`,`main` |
| side | text | enum: `left`,`right`,`center` |
| status | text | enum: `available`,`booked`,`disabled` |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| | | **UNIQUE (trip_id, seat_code)** |

### 10.5 `bookings`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| trip_id | uuid | FK → trips.id |
| customer_name | text | not null |
| mobile_number | text | nullable |
| message | text | nullable |
| payment_screenshot_url | text | nullable |
| advance_amount_total | numeric(10,2) | sum across seats in this booking |
| booking_source | text | enum: `admin`,`public` |
| payment_verified | boolean | default `false` |
| status | text | enum: `confirmed`,`cancelled` |
| created_at | timestamptz | |
| cancelled_at | timestamptz | nullable |
| cancelled_by | uuid | FK → admins.id, nullable |

### 10.6 `booking_seats` (junction table)
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| booking_id | uuid | FK → bookings.id |
| trip_seat_id | uuid | FK → trip_seats.id |
| advance_amount_for_seat | numeric(10,2) | supports admin-side variable advance |
| created_at | timestamptz | |
| | | **UNIQUE partial index on trip_seat_id WHERE booking is active** (prevents double-booking at DB level) |

### 10.7 `trip_logs` (audit trail)
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| trip_id | uuid | FK → trips.id |
| actor_type | text | enum: `admin`,`public`,`system` |
| actor_id | uuid | FK → admins.id, nullable |
| action | text | e.g. `trip_created`, `seat_booked`, `seat_unbooked`, `seat_disabled`, `seat_enabled`, `payment_verified`, `trip_updated` |
| seat_codes | text[] | nullable, seats affected |
| details | jsonb | free-form context (old/new values, amounts, etc.) |
| created_at | timestamptz | default `now()` |

**Entity relationship summary:**
`trips` 1—* `trip_seats` · `trips` 1—* `bookings` · `bookings` 1—* `booking_seats` *—1 `trip_seats` · `trips` 1—* `trip_logs`

---

## 11. Booking Transaction Logic (pseudocode)

```
BEGIN TRANSACTION
  SELECT trip_seats WHERE id IN (:selected_seat_ids) FOR UPDATE
  IF any seat.status != 'available':
      ROLLBACK
      RETURN error { unavailable_seats: [...] }

  INSERT INTO bookings (...)
  FOR EACH selected seat:
      INSERT INTO booking_seats (booking_id, trip_seat_id, advance_amount_for_seat)
      UPDATE trip_seats SET status = 'booked' WHERE id = seat.id
  INSERT INTO trip_logs (action = 'seat_booked', seat_codes = [...])
COMMIT
```

If the commit fails for any reason (including the unique partial index catching a race the row-lock missed), the whole booking fails atomically — no partial holds.

---

## 12. UI Style Reference (from screenshot)

| Element | Style |
|---|---|
| Primary accent | Yellow/gold (seat badges, header dividers) |
| Text/borders | Black, bold sans-serif for headers |
| Background | White cards, subtle bus-motif watermark optional |
| Seat badge | Rounded-rectangle yellow tab with seat code, white body below with customer name |
| Header | Company logo + bus icon + script-style brand name + tagline, dotted divider below |
| Layout | Driver icon top-right, entrance implied top-left, columns aligned in decks |

---

## 13. Edge Cases & Validation Rules

- Booking with 0 seats selected → blocked client-side.
- Mobile number, if entered, validated for digit-only/length but never required.
- Cancelling a booking releases **all** its seats back to `available` and logs the action.
- Disabling a seat that is currently booked should be prevented (unbook first) — or admin gets a confirmation warning if forcing it.
- Public page never exposes other customers' names/phone numbers — only "Booked."
- Duplicate trip share tokens are regenerated on collision (extremely unlikely with UUID/random token generation).
- Trip total seat count edits after bookings exist should warn if it would remove already-booked seats.

---

## 14. Out of Scope / Future Enhancements

- Multi-operator/tenant support (each company with its own branding & admins)
- SMS/WhatsApp confirmation to customers
- Online payment gateway integration (currently QR + manual screenshot only)
- Seat map drag-and-drop custom layout editor
- Role-based admin sub-accounts (e.g., conductor-only view)

---

## 15. Glossary

- **Advance per Seat** — Fixed partial payment amount required to hold one seat, set at trip creation.
- **Total Seat Price** — Full fare for one seat.
- **Balance Due** — Remaining amount owed on booked seats after advance is collected.
- **Trip Share Token** — Random unique string forming the public booking URL for a trip.
- **Trip Seat** — A single bookable unit on the chart (e.g. `U-1`), independent of who books it.
