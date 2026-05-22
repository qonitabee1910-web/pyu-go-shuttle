# 🚀 PYU-GO Shuttle - Quick Refinement Action Plan

**Target**: Sprint-based implementation roadmap dengan specific tasks

---

## 🎯 Phase 1: Critical Fixes (Week 1-2)

### Task 1.1: Database Transactions untuk Booking Atomicity

**Severity**: 🔴 CRITICAL\
**Effort**: 8 points\
**Owner**: Backend

**Steps**:

1. Create Supabase RPC function `atomic_create_booking()` dengan transaction
   logic
2. Update `src/features/booking/services/bookings.functions.ts` untuk call RPC
3. Add test case untuk concurrent booking scenarios
4. Deploy migration ke production

**Files to Create**:

- `supabase/migrations/[timestamp]_atomic_booking.sql`

**Files to Modify**:

- `src/features/booking/services/bookings.functions.ts`

---

### Task 1.2: Admin Route Protection (beforeLoad)

**Severity**: 🔴 CRITICAL\
**Effort**: 5 points\
**Owner**: Frontend

**Steps**:

1. Extract `checkIsAdmin()` call ke route-level `beforeLoad`
2. Apply di ALL admin sub-routes (vehicles, schedules, routes, etc.)
3. Test unauthorized access scenarios
4. Add error UI untuk unauthorized attempts

**Files to Modify**:

- `src/routes/admin.vehicles.tsx`
- `src/routes/admin.schedules.tsx`
- `src/routes/admin.routes.tsx`
- `src/routes/admin.drivers.tsx`
- `src/routes/admin.bookings.tsx`
- `src/routes/admin.pickup-points.tsx`
- `src/routes/admin.operations.tsx`
- `src/routes/admin.analytics.tsx`

**Code Pattern**:

```tsx
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

---

### Task 1.3: Replace Mock Payment dengan Error Handling

**Severity**: 🔴 CRITICAL\
**Effort**: 3 points\
**Owner**: Backend

**Steps**:

1. Remove hardcoded `Math.random() < 0.92` logic
2. Add proper payment status tracking (pending → success/failed)
3. Implement retry logic untuk payment processing
4. Add logging untuk payment attempts

**Files to Modify**:

- `src/features/booking/services/payments.functions.ts`

**Code Change**:

```ts
// ❌ REMOVE THIS
const success = Math.random() < 0.92;

// ✅ REPLACE WITH
// Jika development: always succeed
// Jika production: call real payment gateway atau throw error
const success = process.env.ENVIRONMENT === "development"
    ? true
    : (await processPaymentWithGateway(booking.id));

if (!success) {
    throw new AppError(
        "PAYMENT_FAILED",
        402,
        "Pembayaran gagal. Silakan coba lagi atau hubungi support.",
    );
}
```

---

### Task 1.4: Timezone Standardization

**Severity**: 🟠 HIGH\
**Effort**: 6 points\
**Owner**: Backend + Frontend

**Steps**:

1. Create `src/shared/utils/datetime.ts` dengan dayjs utilities
2. Replace all timezone hardcoding dengan function calls
3. Update database to store UTC + client-side conversion
4. Test timezone switching pada DST boundaries

**Files to Create**:

- `src/shared/utils/datetime.ts`

**Files to Search & Replace**:

- All files dengan `+07:00` pattern
- All files dengan `getTime() + 10 * 60_000` pattern

---

## 🎯 Phase 2: Quality Improvements (Week 3-4)

### Task 2.1: Add Database Indexes

**Severity**: 🟠 HIGH\
**Effort**: 2 points\
**Owner**: Backend

**Files to Create**:

- `supabase/migrations/[timestamp]_add_indexes.sql`

**SQL Script**:

```sql
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_created 
ON public.bookings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seats_schedule_status 
ON public.seats(schedule_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id 
ON public.payments(booking_id);

CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id 
ON public.drivers(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_schedules_departure_at 
ON public.schedules(departure_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles(user_id, role);
```

---

### Task 2.2: Centralize Query Keys

**Severity**: 🟡 MEDIUM\
**Effort**: 4 points\
**Owner**: Frontend

**Files to Create**:

- `src/shared/constants/queryKeys.ts`

**Implementation**:

```ts
export const QueryKeys = {
    admin: {
        bookings: () => ["admin", "bookings"] as const,
        bookingsDetail: (id: string) => ["admin", "bookings", id] as const,
        vehicles: () => ["admin", "vehicles"] as const,
        // ... etc
    },
};
```

**Files to Modify**:

- All files using hardcoded query keys (search: `queryKey: ["admin-`)

---

### Task 2.3: Structured Error Types

**Severity**: 🟡 MEDIUM\
**Effort**: 5 points\
**Owner**: Backend + Frontend

**Files to Create**:

- `src/shared/types/errors.ts`
- `src/shared/utils/error-handler.ts`

**Implementation**:

```ts
export class AppError extends Error {
    constructor(
        public code: ErrorCode,
        public statusCode: number,
        public userMessage: string,
    ) {
        super(userMessage);
    }
}
```

**Files to Modify**:

- All server functions untuk use AppError

---

### Task 2.4: Seat Hold Cleanup Trigger

**Severity**: 🟡 MEDIUM\
**Effort**: 3 points\
**Owner**: Backend

**Files to Create**:

- `supabase/migrations/[timestamp]_seat_hold_cleanup.sql`

**SQL Script**:

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_seat_holds()
RETURNS void AS $$
BEGIN
  UPDATE public.seats
  SET status = 'available', hold_until = NULL
  WHERE status = 'held' 
  AND hold_until IS NOT NULL
  AND hold_until < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Implementation Checklist

### Week 1 Deliverables

- [ ] Booking atomicity with DB transactions
- [ ] Admin route protection complete
- [ ] Mock payment removed + error handling
- [ ] Timezone functions created + integrated

### Week 2 Deliverables

- [ ] Database indexes created
- [ ] Query keys centralized
- [ ] Error types standardized
- [ ] Seat hold cleanup implemented

### Testing

- [ ] Unit tests untuk critical paths
- [ ] Integration tests untuk booking flow
- [ ] Load tests untuk concurrent operations
- [ ] Manual security audit

### Deployment

- [ ] Database migrations applied
- [ ] Code deployed ke staging
- [ ] E2E testing pada staging
- [ ] Production deployment dengan rollback plan

---

## 📝 Constants & Configurations to Add

### `src/shared/constants/config.ts`

```ts
export const BOOKING_CONFIG = {
    SEAT_HOLD_DURATION_MS: 10 * 60_1000, // 10 minutes
    PAYMENT_TIMEOUT_MS: 5 * 60_1000, // 5 minutes
    MAX_SEATS_PER_BOOKING: 8,
};

export const ADMIN_CONFIG = {
    ADMIN_ROLE: "admin",
    REQUIRED_ROLE_CHECK_INTERVAL_MS: 60_000, // Re-verify every 1 minute
};

export const TIMEZONE = {
    DEFAULT: "Asia/Jakarta",
    DISPLAY_FORMAT: "DD MMM YYYY HH:mm",
    API_FORMAT: "YYYY-MM-DD[T]HH:mm:ss[Z]",
};
```

---

## 🔐 Security Hardening Checklist

Priority untuk implement:

1. **Rate Limiting** (Week 3)
   - Max 5 booking attempts per IP per minute
   - Max 3 failed login attempts per user per hour

2. **Request Validation** (Week 1)
   - Zod schemas untuk ALL inputs
   - Max string lengths enforced
   - Phone number format validation

3. **CORS Protection** (Week 2)
   - Whitelist allowed origins di Cloudflare Worker
   - No wildcards (`*`) di production

4. **Audit Logging** (Week 3)
   - Log ALL admin actions
   - Log payment attempts/failures
   - Log failed auth attempts

---

## 📈 Performance Targets

### Booking Flow

- Create booking: < 500ms (p95)
- Get user bookings: < 1s (p95)
- Payment processing: < 2s (p95)

### Admin Dashboard

- Load dashboard: < 2s (p95)
- List vehicles: < 500ms
- List schedules: < 500ms

### Database

- All queries: < 200ms (p95)
- Booking atomicity: 0 failures under 100 concurrent

---

## 🚨 Rollback Plan

Jika ada issue:

1. **Booking atomicity fails**:
   - Revert RPC function ke old implementation
   - Deploy old server functions code

2. **Route protection breaks auth flow**:
   - Disable beforeLoad checks temporarily
   - Deploy previous admin.tsx version

3. **Timezone changes cause mismatch**:
   - Keep UTC storage, only client-side conversion

---

## Definisi Done

✅ Task selesai bila:

- Code reviewed dan approved (min 1 reviewer)
- All tests passing (unit + integration)
- No new ESLint warnings
- Database migrations applied successfully
- Staging environment tested
- Performance targets achieved

---

**Prepared by**: Architecture Review\
**Date**: 22 May 2026\
**Next Sync**: Weekly Sprint Planning
