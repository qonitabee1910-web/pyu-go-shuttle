# 📋 Analisis Komprehensif Struktur Aplikasi PYU-GO Shuttle

**Tanggal**: 22 Mei 2026\
**Status**: Review & Refinement Plan

---

## 📑 Daftar Isi

1. [Ringkasan Eksekutif](#ringkasan-eksekutif)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Review Lapisan-Lapisan](#review-lapisan-lapisan)
4. [Temuan Kritis](#temuan-kritis)
5. [Rekomendasi Refinement](#rekomendasi-refinement)
6. [Rencana Implementasi](#rencana-implementasi)

---

## Ringkasan Eksekutif

### Kualitas Keseluruhan: ⭐⭐⭐⭐ (4/5)

**Kekuatan:**

- ✅ Struktur modular yang jelas (per-feature)
- ✅ Type safety yang ketat (TypeScript strict mode)
- ✅ Middleware auth yang terpusat dan reusable
- ✅ Server Functions pattern untuk security
- ✅ Database schema terstruktur dengan RLS policies

**Kelemahan Utama:**

- ❌ Race condition pada booking (atomicity issue)
- ❌ Auth protection incomplete di route level
- ❌ Error handling & rollback patterns tidak konsisten
- ❌ Timezone management tidak standardized
- ❌ Mock data masih tersebar di codebase

---

## Arsitektur Sistem

### Stack Teknologi

```
┌─────────────────────────────────────────┐
│         Frontend Layer (React)           │
│  Router | Hooks | Components | State   │
├─────────────────────────────────────────┤
│       Server Functions (TanStack Start)  │
│    Middleware | Auth | Validation       │
├─────────────────────────────────────────┤
│    Supabase Client / Database SDK       │
├─────────────────────────────────────────┤
│   PostgreSQL + Auth | RLS | Storage     │
├─────────────────────────────────────────┤
│       Cloudflare Workers (Edge)         │
└─────────────────────────────────────────┘
```

### Feature Organization

```
src/
├── features/                    # Business logic per-domain
│   ├── admin/                  # Admin operations
│   │   ├── services/           # Server functions (CRUD + KPIs)
│   │   ├── components/         # UI components
│   │   ├── store/              # Local state (zustand)
│   │   └── types.ts            # Domain types
│   ├── booking/                # Ticket booking flow
│   │   ├── services/           # createBooking, payBooking
│   │   ├── hooks/              # useBooking, usePayment
│   │   └── components/
│   ├── shuttle/                # Shuttle-specific features
│   ├── driver/                 # Driver features
│   ├── ride/                   # Ride tracking
│   └── account/                # User account
├── integrations/               # External services
│   └── supabase/
│       ├── auth-middleware.ts  # Auth guards (requireSupabaseAuth, requireAdminAuth)
│       ├── client.ts           # Browser client
│       ├── client.server.ts    # Server client
│       └── types.ts            # Generated from database
├── routes/                     # TanStack Router pages
├── shared/                     # Common utilities
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
└── integrations/
```

---

## Review Lapisan-Lapisan

### 1. Frontend Layer (React Components & Routing)

#### ✅ Kekuatan

- **Mobile-first design**: Constraint max-width: 24rem (384px) untuk
  mobile-optimal experience
- **Route structure**: File-based routing dengan TanStack Router
  (auto-generated)
- **Error boundaries**: Custom 404 & error components di root level
- **Component organization**: Atomic design dengan shared + feature-specific UI

#### ⚠️ Masalah

- **Admin protection tidak ketat**: `AdminLayout` component mengecek auth di
  `beforeLoad`, tapi masih perlu validasi di component level
  ```tsx
  // ❌ Kurang aman - hanya cek di beforeLoad
  export const Route = createFileRoute("/admin")({
      beforeLoad: async ({ context }) => {
          const res = await checkIsAdmin(); // Server function call
          if (!res.isAdmin) throw redirect({ to: "/" });
      },
      component: AdminLayout,
  });
  ```

- **No role-based route filtering**: Tidak ada mechanism untuk unauthorized
  access prevention jika middleware kembali false

#### 🔧 Rekomendasi

- Implementasi `beforeLoad` hooks di ALL admin sub-routes
- Tambahkan client-side guards dengan proper error UI
- Implementasi permission-based component rendering

---

### 2. Server Functions & Middleware (TanStack Start)

#### ✅ Kekuatan

- **Centralized auth middleware**: `requireSupabaseAuth` & `requireAdminAuth`
  applied ke semua critical functions
- **Input validation**: Zod schemas untuk semua inputs
- **Error handling**: Try-catch dengan meaningful error messages
- **Token verification**: JWT claims validation dengan
  `supabase.auth.getClaims()`

#### ⚠️ Masalah

**A. Race Condition pada Booking**

```ts
// ❌ NOT ATOMIC - Vulnerable to double-booking
export const createBooking = createServerFn(...)
  .handler(async ({ data, context }) => {
    // Step 1: Update seats (dapat gagal/conflict)
    const { data: updatedSeats } = await supabase
      .from("seats")
      .update({ status: "held" })
      .in("id", data.seatIds)
      .eq("schedule_id", data.scheduleId)
      .or(`status.eq.available,and(status.eq.held,hold_until.lt....)`)
      .select();

    // Step 2: If intermediate request, booking created with wrong seats
    const { data: booking } = await supabase
      .from("bookings")
      .insert({...})
      .select().single();

    // Step 3: Link seats (kalo fail, seats held tapi booking orphaned)
    const { error: linkErr } = await supabase
      .from("seat_bookings")
      .insert(...)
  });
```

**Risk Scenario:**

1. User A requests seats [1,2,3] dari schedule X
2. Seats diupdate ke "held"
3. **Network delay di step booking creation**
4. User B makes request untuk seats [2] dari schedule X
5. Seat 2 masih "held" tapi belum linked ke booking A
6. Booking B bisa created dengan seat 2

**Solution**: Implementasi PostgreSQL transactions:

```sql
BEGIN TRANSACTION;
  -- Lock seats row-by-row
  SELECT * FROM seats 
  WHERE id = ANY($1) AND schedule_id = $2 
  FOR UPDATE;
  
  -- Verify availability
  -- Update to held
  -- Create booking
  -- Link seats
COMMIT;
```

**B. Middleware Chain Gaps**

```ts
// ⚠️ requireAdminAuth middleware chain tidak konsisten
export const requireAdminAuth = createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth]) // Depends on requireSupabaseAuth
    .server(async ({ context, next }) => {
        const { supabase, userId } = context;
        const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();

        if (error || !data) {
            throw new Error("Forbidden: Admin role required");
        }
        return next();
    });
```

- Tidak ada caching untuk role queries (mungkin hit DB N times per request)
- Tidak ada fallback jika role table unavailable

**C. Payment Processing Issues**

```ts
// ❌ Mock payment dengan hardcoded success rate
const success = Math.random() < 0.92; // 92% success rate ???
```

- Untuk testing/demo OK, tapi PRODUCTION DISASTER
- Tidak ada proper payment gateway integration (Stripe, Midtrans, dll)

#### 🔧 Rekomendasi

1. **Implementasi database transactions** untuk booking atomicity
2. **Cache admin roles** di context/JWT untuk avoid N+1 queries
3. **Proper payment gateway** dengan webhook handling
4. **Circuit breaker pattern** untuk external service calls
5. **Request tracing** untuk debugging distributed calls

---

### 3. Database Layer (PostgreSQL + Supabase)

#### ✅ Kekuatan

- **RLS Policies**: Customer hanya bisa read own bookings
- **Type enums**: Proper enum types untuk status tracking
- **Foreign keys**: Referential integrity dengan CASCADE deletes
- **Timestamps**: `created_at` & `updated_at` default management

#### ⚠️ Masalah

**A. Missing Indexes**

```sql
-- ❌ No indexes untuk common queries
SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC;
SELECT * FROM seats WHERE schedule_id = $1 AND status != 'booked';
```

**B. No Optimistic Locking**

```sql
-- Seat update bisa conflict jika concurrent requests
UPDATE seats SET status = 'held' 
WHERE id = ANY($1) AND schedule_id = $2 
AND status = 'available';
-- Tidak ada version/revision check
```

**C. Seat Hold Timeout**

```sql
-- hold_until column exists tapi tidak ada automated cleanup
-- Seats might stay "held" forever jika payment timeout
SELECT * FROM seats WHERE status = 'held' AND hold_until < NOW();
-- No trigger untuk auto-release expired holds
```

#### 🔧 Rekomendasi

1. **Create indexes** pada frequently queried columns:
   ```sql
   CREATE INDEX idx_bookings_user_id ON bookings(user_id, created_at DESC);
   CREATE INDEX idx_seats_schedule_status ON seats(schedule_id, status);
   CREATE INDEX idx_payments_booking_id ON payments(booking_id);
   ```

2. **Add optimistic locking**:
   ```sql
   ALTER TABLE seats ADD COLUMN version INT DEFAULT 1;
   -- Update dengan version check untuk detect conflicts
   ```

3. **Implement seat hold cleanup**:
   ```sql
   -- Trigger atau scheduled function
   CREATE OR REPLACE FUNCTION cleanup_expired_holds()
   RETURNS void AS $$
   BEGIN
     UPDATE seats 
     SET status = 'available', hold_until = NULL
     WHERE status = 'held' AND hold_until < NOW();
   END;
   $$ LANGUAGE plpgsql;
   ```

---

### 4. Authentication & Authorization

#### ✅ Kekuatan

- **JWT-based auth**: Token validation via `supabase.auth.getClaims()`
- **Role-based access control**: `user_roles` table dengan `has_role()` function
- **Row-level security**: Policies untuk per-row access control

#### ⚠️ Masalah

**A. Auth Middleware Injection Inconsistent**

```ts
// ✅ Properly protected
export const adminListVehicles = createServerFn(...)
  .middleware([requireAdminAuth])
  .handler(async ...)

// ❌ Unprotected - anyone dapat call
export const getPublicSchedules = createServerFn(...)
  .handler(async ...)
```

**B. Session Management Issues**

```tsx
// ❌ No session refresh strategy
async function logoutUser() {
    await supabase.auth.signOut();
    // Existing tokens still valid untuk ~1 jam
}
```

**C. CORS & CSRF Protection**

- Tidak ada `X-CSRF-Token` header validation
- CORS headers mungkin too permissive di Cloudflare Worker config

#### 🔧 Rekomendasi

1. **Audit semua server functions** untuk middleware coverage
2. **Implement token refresh logic** dengan short-lived access tokens +
   long-lived refresh tokens
3. **Add CSRF protection** untuk state-changing operations
4. **Implement session revocation** di sign-out

---

### 5. State Management (Zustand + React Query)

#### ✅ Kekuatan

- **Centralized query management**: `useQuery` untuk data fetching
- **Automatic cache invalidation**: `queryClient.invalidateQueries()`
- **Optimistic updates**: Supported by React Query

#### ⚠️ Masalah

**A. Query Key Consistency**

```ts
// Inconsistent query keys mungkin cause cache misses
const { data: routes = [] } = useQuery({
    queryKey: ["admin-routes"], // ⚠️ No versioning
    queryFn: () => list(),
});

// Jika backend changed, cache still returns old data
```

**B. No Invalidation Strategy**

```ts
// After mutation, harus manually invalidate
await up({ data: v });
toast.success("Tersimpan");
qc.invalidateQueries({ queryKey: ["admin-routes"] });
```

- Tidak ada automatic invalidation patterns
- Risk: Multiple queries dependent pada data yang invalidated

**C. Mutation Error Handling**

```tsx
try {
    await up({ data: v });
    toast.success("Tersimpan");
} catch (e: any) {
    toast.error(e.message ?? "Gagal");
    // No retry logic, no rollback
}
```

#### 🔧 Rekomendasi

1. **Centralize query keys** dengan constants:
   ```ts
   export const QueryKeys = {
       admin: {
           routes: () => ["admin", "routes"],
           routesDetail: (id: string) => ["admin", "routes", id],
       },
       bookings: {
           list: (userId: string) => ["bookings", userId],
       },
   };
   ```

2. **Implement mutation response cache**:
   ```ts
   const mutation = useMutation({
       mutationFn: updateRoute,
       onSuccess: (data) => {
           queryClient.setQueryData(
               QueryKeys.admin.routesDetail(data.id),
               data,
           );
           queryClient.invalidateQueries({
               queryKey: QueryKeys.admin.routes(),
           });
       },
   });
   ```

3. **Add retry + error boundaries** dengan exponential backoff

---

### 6. Error Handling & Logging

#### ⚠️ Masalah

**A. Generic Error Messages**

```ts
catch (e: any) {
  toast.error(e.message ?? "Gagal");
}
```

- User tidak tahu apa yang salah
- Tidak traceable untuk debugging

**B. No Structured Logging**

```ts
console.error(error); // Only di browser console
```

- Tidak ada server-side logging
- Error events tidak di-aggregate/monitor

**C. No Error Boundaries untuk Features**

```tsx
// Jika adminListVehicles fails, whole admin page breaks
const { data: vehicles = [] } = useQuery({ ... });
```

#### 🔧 Rekomendasi

1. **Implement structured error types**:
   ```ts
   type ErrorCode =
       | "VALIDATION_ERROR"
       | "UNAUTHORIZED"
       | "FORBIDDEN"
       | "NOT_FOUND"
       | "CONFLICT"
       | "SERVER_ERROR";

   class AppError extends Error {
       constructor(
           public code: ErrorCode,
           public statusCode: number,
           message: string,
       ) {
           super(message);
       }
   }
   ```

2. **Add comprehensive logging**:
   ```ts
   // Server-side
   logger.error("booking_creation_failed", {
       userId,
       scheduleId,
       seatIds,
       error: e.message,
       timestamp: new Date().toISOString(),
   });
   ```

3. **Implement feature-level error boundaries**:
   ```tsx
   <ErrorBoundary fallback={<VehicleListError />}>
       <VehicleList />
   </ErrorBoundary>;
   ```

---

### 7. Code Quality & Maintainability

#### ✅ Kekuatan

- **TypeScript strict mode**: Mencegah type errors di compile time
- **ESLint configuration**: React hooks linting, no unused vars warning
- **File organization**: Clear separation of concerns
- **Naming conventions**: Consistent CamelCase & kebab-case usage

#### ⚠️ Masalah

**A. Magic Numbers & Strings**

```ts
const holdUntil = new Date(now.getTime() + 10 * 60_000).toISOString(); // 10 menit? dokumentasi?
const success = Math.random() < 0.92; // 92% dari mana?
```

**B. Missing JSDoc Comments**

```ts
export const createBooking = createServerFn(...)  // Apa yang di-return? Side effects?
```

**C. Hardcoded Values di Code**

```tsx
const hideNav = HIDE_NAV_PREFIXES.some((p) => loc.pathname.startsWith(p));
// Defined di mana? Bisa di-extract ke constants file
```

#### 🔧 Rekomendasi

1. **Extract magic numbers ke constants**:
   ```ts
   // src/shared/constants/index.ts
   export const SEAT_HOLD_DURATION_MS = 10 * 60_000; // 10 minutes
   export const PAYMENT_MOCK_SUCCESS_RATE = 0.92;
   export const ADMIN_ROLE = "admin";
   ```

2. **Add JSDoc comments**:
   ```ts
   /**
    * Creates a new booking for a passenger
    * @param scheduleId - Schedule UUID
    * @param seatIds - Array of seat UUIDs to book
    * @param passengerName - Passenger name for booking confirmation
    * @returns Booking ID, confirmation code, and total amount
    * @throws AppError with CONFLICT code if seats already booked
    */
   export const createBooking = ...
   ```

3. **Extract route patterns**:
   ```ts
   export const ROUTE_PATTERNS = {
       HIDE_NAV: ["/auth", "/admin", "/driver"],
       ADMIN_ONLY: ["/admin"],
       DRIVER_ONLY: ["/driver"],
   };
   ```

---

## Temuan Kritis

### Priority 🔴 CRITICAL (P0)

#### 1. Booking Race Condition

- **Impact**: Revenue loss, customer dissatisfaction, double-charging
- **Root Cause**: Non-atomic multi-step seat allocation
- **Detection**: High concurrency during peak hours akan cause "Sebagian kursi
  sudah tidak tersedia"
- **Fix Complexity**: HIGH (require DB transaction refactoring)

#### 2. Admin Route Protection

- **Impact**: Unauthorized access to admin functions
- **Root Cause**: Only checked in `beforeLoad`, not in sub-routes
- **Detection**: Direct URL navigation ke `/admin/vehicles` tanpa `/admin`
  parent
- **Fix Complexity**: MEDIUM (add beforeLoad ke each sub-route)

#### 3. Payment Mock in Production Code

- **Impact**: Unpredictable payment failures (92% success rate)
- **Root Cause**: Demo code left in production
- **Fix Complexity**: HIGH (require payment gateway integration)

---

### Priority 🟠 HIGH (P1)

#### 4. Missing Database Indexes

- **Impact**: Query performance degradation at scale (1000+ bookings)
- **Detection**: Database query slowdown > 500ms
- **Fix Complexity**: LOW (simple CREATE INDEX statements)

#### 5. Timezone Hardcoding

- **Impact**: Incorrect scheduling during DST transitions
- **Detection**: Mismatch antara user timezone dan database timezone
- **Fix Complexity**: MEDIUM (migrate to UTC + client-side conversion)

#### 6. Incomplete Error Handling

- **Impact**: Silent failures, poor debugging
- **Detection**: Vague error messages di production logs
- **Fix Complexity**: MEDIUM (require structured error framework)

---

### Priority 🟡 MEDIUM (P2)

#### 7. No Session Revocation

- **Impact**: Compromised tokens still valid
- **Detection**: Former employee bisa access dengan old token
- **Fix Complexity**: MEDIUM (token revocation list di Redis)

#### 8. Query Key Inconsistency

- **Impact**: Stale data in UI after mutations
- **Detection**: User update vehicle but old data shown
- **Fix Complexity**: MEDIUM (centralized QueryKeys constant)

#### 9. Seat Hold Timeout

- **Impact**: Occupied seats blocking new bookings
- **Detection**: Some seats stay "held" forever
- **Fix Complexity**: LOW (PL/pgSQL trigger + cron)

---

## Rekomendasi Refinement

### Phase 1: Stabilitas & Keamanan (Sprint 1-2)

#### 1.1 Fix Booking Atomicity ⭐ CRITICAL

**File**: `src/features/booking/services/bookings.functions.ts`

**Current Problem**:

```ts
// Non-atomic steps
const { data: updatedSeats } = await supabase.from("seats").update(...);
const { data: booking } = await supabase.from("bookings").insert(...);
const { error: linkErr } = await supabase.from("seat_bookings").insert(...);
```

**Solution**: Use PostgreSQL transaction

```ts
// Create Supabase RPC function
export const atomicCreateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(...)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    // Call Supabase RPC yang sudah punya transaction logic
    const { data: result, error } = await supabase
      .rpc("atomic_create_booking", {
        p_user_id: userId,
        p_schedule_id: data.scheduleId,
        p_seat_ids: data.seatIds,
        p_passenger_name: data.passengerName,
        p_passenger_phone: data.passengerPhone,
      });
    
    if (error) throw error;
    return result;
  });
```

**Database RPC Function**:

```sql
CREATE OR REPLACE FUNCTION atomic_create_booking(
  p_user_id UUID,
  p_schedule_id UUID,
  p_seat_ids UUID[],
  p_passenger_name TEXT,
  p_passenger_phone TEXT
)
RETURNS TABLE (
  booking_id UUID,
  code TEXT,
  total NUMERIC
) AS $$
DECLARE
  v_code TEXT;
  v_total NUMERIC;
  v_price NUMERIC;
BEGIN
  -- Lock seats for update (pessimistic locking)
  LOCK TABLE seats IN EXCLUSIVE MODE;
  
  -- Verify seats are available
  IF NOT EXISTS (
    SELECT 1 FROM seats 
    WHERE id = ANY(p_seat_ids)
    AND schedule_id = p_schedule_id
    AND status = 'available'
    AND array_length(p_seat_ids, 1) = (
      SELECT COUNT(*) FROM seats
      WHERE id = ANY(p_seat_ids)
      AND schedule_id = p_schedule_id
      AND status = 'available'
    )
  ) THEN
    RAISE EXCEPTION 'Sebagian kursi sudah tidak tersedia';
  END IF;

  -- Get price
  SELECT price INTO v_price FROM schedules WHERE id = p_schedule_id;
  v_total := v_price * array_length(p_seat_ids, 1);

  -- Generate code
  v_code := 'PYU' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6);

  -- Create booking
  INSERT INTO bookings (
    user_id, schedule_id, code, status, total,
    passenger_name, passenger_phone
  )
  VALUES (
    p_user_id, p_schedule_id, v_code, 'pending', v_total,
    p_passenger_name, p_passenger_phone
  )
  RETURNING id, v_code, v_total INTO booking_id, code, total;

  -- Hold seats
  UPDATE seats SET 
    status = 'held',
    hold_until = NOW() + INTERVAL '10 minutes'
  WHERE id = ANY(p_seat_ids);

  -- Link seats to booking
  INSERT INTO seat_bookings (booking_id, seat_id, passenger_name)
  SELECT booking_id, s, p_passenger_name
  FROM UNNEST(p_seat_ids) AS s;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 Protect Admin Routes

**File**: `src/routes/admin.tsx` + all sub-routes

**Current**: Only checked di parent route

**Solution**: Add beforeLoad ke sub-routes juga

```tsx
// src/routes/admin.vehicles.tsx
export const Route = createFileRoute("/admin/vehicles")({
    head: () => ({ meta: [{ title: "Vehicles — PYU-GO Admin" }] }),
    beforeLoad: async () => {
        const res = await checkIsAdmin();
        if (!res.isAdmin) {
            throw redirect({
                to: "/",
                search: { error: "Akses admin diperlukan" },
            });
        }
    },
    component: VehiclesPage,
});
```

#### 1.3 Standardize Timezone

**File**: `src/shared/utils/datetime.ts` (new)

```ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const JAKARTA_TZ = "Asia/Jakarta";

export const formatDateTime = (date: Date | string) =>
    dayjs(date).tz(JAKARTA_TZ).format("DD MMM YYYY HH:mm");

export const getScheduleDeparture = (date: Date | string) =>
    dayjs(date).tz(JAKARTA_TZ).toDate();

export const getNowInJakarta = () => dayjs().tz(JAKARTA_TZ).toDate();
```

---

### Phase 2: Pengalaman Pengguna (Sprint 3-4)

#### 2.1 Add Database Indexes

**File**: `supabase/migrations/` (new)

```sql
CREATE INDEX idx_bookings_user_id_created 
ON bookings(user_id, created_at DESC);

CREATE INDEX idx_seats_schedule_status 
ON seats(schedule_id, status);

CREATE INDEX idx_payments_booking_id 
ON payments(booking_id);

CREATE INDEX idx_drivers_vehicle_id 
ON drivers(vehicle_id);

CREATE INDEX idx_schedules_departure_at 
ON schedules(departure_at DESC);
```

#### 2.2 Query Key Centralization

**File**: `src/shared/constants/queryKeys.ts` (new)

```ts
export const QueryKeys = {
    admin: {
        bookings: () => ["admin", "bookings"],
        bookingsDetail: (id: string) => ["admin", "bookings", id],

        vehicles: () => ["admin", "vehicles"],
        vehiclesDetail: (id: string) => ["admin", "vehicles", id],

        schedules: () => ["admin", "schedules"],
        schedulesDetail: (id: string) => ["admin", "schedules", id],

        routes: () => ["admin", "routes"],
        routesDetail: (id: string) => ["admin", "routes", id],

        pickupPoints: () => ["admin", "pickupPoints"],
        drivers: () => ["admin", "drivers"],

        kpis: () => ["admin", "kpis"],
        analytics: (range?: string) => ["admin", "analytics", range ?? "30d"],
    },

    bookings: {
        myList: (userId: string) => ["bookings", "my", userId],
        detail: (id: string) => ["bookings", id],
    },

    schedules: {
        list: (routeId?: string) =>
            routeId ? ["schedules", routeId] : ["schedules"],
    },
};
```

#### 2.3 Structured Error Handling

**File**: `src/shared/types/errors.ts` (new)

```ts
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    public userMessage: string,
    message?: string
  ) {
    super(message ?? userMessage);
    this.name = "AppError";
  }

  toJSON() {
    return {
      code: this.code,
      statusCode: this.statusCode,
      message: this.userMessage,
      details: this.message,
    };
  }
}

// Usage in server functions
export const createBooking = createServerFn(...)
  .handler(async ({ data, context }) => {
    try {
      // ... booking logic
    } catch (e: any) {
      if (e.code === "PGRST116") {
        // No rows returned
        throw new AppError(
          "NOT_FOUND",
          404,
          "Jadwal tidak ditemukan",
          e.message
        );
      }
      throw new AppError(
        "INTERNAL_ERROR",
        500,
        "Terjadi kesalahan saat membuat booking",
        e.message
      );
    }
  });
```

#### 2.4 Implement Seat Hold Cleanup

**File**: `supabase/migrations/` (new)

```sql
-- Trigger untuk auto-release expired holds
CREATE OR REPLACE FUNCTION cleanup_expired_seat_holds()
RETURNS void AS $$
BEGIN
  UPDATE seats
  SET status = 'available', hold_until = NULL
  WHERE status = 'held' 
  AND hold_until IS NOT NULL
  AND hold_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule dengan pg_cron extension
-- SELECT cron.schedule('cleanup-seat-holds', '*/5 * * * *', 
--   'SELECT cleanup_expired_seat_holds()');
```

---

### Phase 3: Infrastruktur & DevOps (Sprint 5-6)

#### 3.1 Real Payment Gateway Integration

**File**: `src/features/booking/services/payments.functions.ts`

```ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const payBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(...)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const booking = await supabase
      .from("bookings")
      .select("id, user_id, total, status")
      .eq("id", data.bookingId)
      .single();

    if (booking.user_id !== userId) {
      throw new AppError("FORBIDDEN", 403, "Anda tidak punya akses");
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total * 100), // Convert to cents
      currency: 'idr',
      metadata: { bookingId: booking.id, userId },
    });

    // Store payment intent ID untuk webhook verification
    await supabase.from("payments").insert({
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: booking.total,
      status: 'pending',
    });

    return { clientSecret: paymentIntent.client_secret };
  });

// Webhook handler untuk payment confirmation
export const handleStripeWebhook = createServerFn({ 
  method: "POST",
  // This endpoint tidak butuh auth - Stripe yang call
})
  .handler(async ({ data: event }) => {
    const sig = event.headers['stripe-signature'];
    
    try {
      const webhookEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      if (webhookEvent.type === 'payment_intent.succeeded') {
        const paymentIntent = webhookEvent.data.object;
        const bookingId = paymentIntent.metadata.bookingId;

        // Mark booking as paid
        await supabase.from("bookings")
          .update({ status: 'paid' })
          .eq("id", bookingId);

        // Mark seats as booked
        // ... seat update logic
      }
    } catch (error) {
      logger.error('webhook_error', error);
      throw error;
    }
  });
```

#### 3.2 Logging & Monitoring

**File**: `src/integrations/supabase/logger.ts` (new)

```ts
interface LogEntry {
    level: "info" | "warn" | "error";
    service: string;
    action: string;
    userId?: string;
    metadata?: Record<string, any>;
    timestamp: string;
}

export async function logEvent(entry: LogEntry) {
    // Log ke Supabase table untuk audit trail
    await supabase.from("audit_logs").insert({
        level: entry.level,
        service: entry.service,
        action: entry.action,
        user_id: entry.userId,
        metadata: entry.metadata,
        created_at: new Date().toISOString(),
    });

    // Log ke external service (Sentry, LogRocket, dll)
    if (entry.level === "error") {
        // Sentry.captureException(new Error(entry.action), {...});
    }
}

// Usage
await logEvent({
    level: "info",
    service: "booking",
    action: "booking_created",
    userId: userId,
    metadata: { bookingId, totalAmount },
});
```

---

## Rencana Implementasi

### Timeline & Prioritas

| Phase | Sprint | Fokus                  | Duration | Status    |
| ----- | ------ | ---------------------- | -------- | --------- |
| **1** | 1-2    | Stabilitas & Keamanan  | 2 minggu | 🔴 TODO   |
| **2** | 3-4    | UX & Performance       | 2 minggu | 🔴 TODO   |
| **3** | 5-6    | Infrastruktur          | 2 minggu | 🔴 TODO   |
| **4** | 7+     | Optimization & Scaling | Ongoing  | 🔴 FUTURE |

### Testing Checklist

- [ ] Unit tests untuk booking logic (atomicity scenarios)
- [ ] Integration tests untuk server functions + DB
- [ ] Load tests untuk booking pada peak hours (100+ concurrent requests)
- [ ] Security audit (OWASP Top 10)
- [ ] Performance profiling (Lighthouse, DevTools)

### Deployment Strategy

1. **Feature flags**: Deploy dengan beta flag untuk payment gateway
2. **Gradual rollout**: 10% → 50% → 100% untuk critical features
3. **Rollback plan**: Database migration + code revert untuk emergency
4. **Monitoring**: Real-time alerts untuk error rates > 5%

---

## Metrik & KPI Kesuksesan

### Stabilitas

- ✅ Zero double-booking incidents dalam 30 hari
- ✅ Admin access success rate > 99.9%
- ✅ Payment success rate > 98%

### Performance

- ✅ Booking creation < 500ms p95
- ✅ Dashboard load < 2s p95
- ✅ Query performance < 200ms untuk semua admin queries

### Security

- ✅ Zero unauthorized admin access attempts
- ✅ All server functions protected dengan auth middleware
- ✅ No sensitive data in logs

---

## Lampiran

### A. Struktur Database Terbaru

```sql
-- Key tables yang sudah exist
public.profiles          -- User profile
public.user_roles        -- Role assignment
public.vehicles          -- Shuttle/car management
public.drivers           -- Driver information
public.routes            -- Route master data
public.pickup_points     -- Pickup location master
public.schedules         -- Schedule/departure master
public.seats             -- Seat availability (per schedule)
public.bookings          -- Booking records
public.seat_bookings     -- Seat-to-booking link
public.payments          -- Payment records
public.transactions      -- Transaction log
```

### B. Rekomendasi Tools & Libraries

```json
{
    "monitoring": ["Sentry", "LogRocket"],
    "payment": ["Stripe", "Xendit"],
    "dateTime": ["dayjs", "date-fns"],
    "validation": ["Zod", "Superstruct"],
    "testing": ["Vitest", "Playwright"],
    "logging": ["Pino", "Winston"]
}
```

### C. Security Checklist

- [ ] HTTPS enforced (Cloudflare SSL/TLS)
- [ ] CORS headers properly configured
- [ ] CSRF tokens untuk state-changing requests
- [ ] Rate limiting pada sensitive endpoints
- [ ] Input sanitization untuk semua forms
- [ ] SQL injection prevention (prepared statements via ORM/SDK)
- [ ] XSS prevention (React auto-escapes, CSP headers)
- [ ] Password policies enforced
- [ ] 2FA untuk admin accounts

---

**Document Version**: 1.0\
**Last Updated**: 22 Mei 2026\
**Next Review**: 2 Juni 2026
