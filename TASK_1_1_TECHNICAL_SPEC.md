# 📋 Task 1.1: Booking Atomicity - Technical Specification

**Status**: Ready for Implementation\
**Date**: 22 Mei 2026\
**Priority**: 🔴 CRITICAL\
**Effort**: 8 story points (3-5 days)

---

## 📑 Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Architecture](#solution-architecture)
3. [Database Changes](#database-changes)
4. [Application Code Changes](#application-code-changes)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Plan](#deployment-plan)
7. [Rollback Procedure](#rollback-procedure)
8. [Acceptance Criteria](#acceptance-criteria)

---

## Problem Statement

### Current Issue: Race Condition in Booking

**Scenario**:

```
Time | User A                              | User B
-----|--------------------------------------|-----------------------
T1   | SELECT * FROM seats (check avail)  |
T2   |                                     | SELECT * FROM seats (check avail)
T3   | UPDATE seats SET status='held'    |
T4   | INSERT INTO bookings               |
T5   |                                     | UPDATE seats SET status='held'
T6   | INSERT INTO seat_bookings          |
T7   |                                     | INSERT INTO bookings
T8   |                                     | INSERT INTO seat_bookings
```

**Problem**: Steps 3-6 are NOT atomic. Between T3 and T6:

- Seats are "held" but not yet linked to a booking
- If network fails at T4, seats remain held orphaned
- Concurrent requests see "held" seats but can still try to book them
- Result: Double-booking atau data inconsistency

### Current Code Issue

[File: `src/features/booking/services/bookings.functions.ts`]

```typescript
// ❌ NOT ATOMIC - Multiple roundtrips to DB
const { data: updatedSeats } = await supabase
  .from("seats")
  .update({ status: "held", hold_until: holdUntil })
  .in("id", data.seatIds)
  .eq("schedule_id", data.scheduleId)
  // ← Check expires availability here
  .select();

// ← NETWORK DELAY - Long time gap here
// ← Another booking could be created with same seats

const { data: booking } = await supabase
  .from("bookings")
  .insert({...})
  .select()
  .single();

// ← Another gap - Booking created but not linked
// ← If crash here, booking is orphaned

const { error: linkErr } = await supabase
  .from("seat_bookings")
  .insert(...);
  // ← If error here, booking has no seats linked
```

**Impact**:

- 🔴 **Revenue Loss**: Customer charged but booking invalid
- 🔴 **Poor UX**: "Sorry, seats not available" after already holding them
- 🔴 **Data Integrity**: Bookings without linked seats in database
- 🔴 **Reputation Damage**: Customers frustrated with double-bookings

---

## Solution Architecture

### High-Level Approach

Instead of multiple SDK calls, use **PostgreSQL RPC (Remote Procedure Call)**
with transaction logic inside the database:

```
Frontend                    TanStack Start Server         Supabase/PostgreSQL
  │                              │                              │
  │─ createBooking() ───────────→│                              │
  │                              │─ Call RPC ──────────────────→│
  │                              │ atomic_create_booking()      │
  │                              │                              │
  │                              │            BEGIN TRANSACTION;
  │                              │            LOCK seats;
  │                              │            SELECT available;
  │                              │            INSERT booking;
  │                              │            UPDATE seats;
  │                              │            INSERT links;
  │                              │            COMMIT;
  │                              │                              │
  │←─────── Response ───────────│←─ Single result ────────────│
  │                              │                              │
```

### Key Benefits

| Benefit                      | Impact                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| **Single Network Call**      | Reduce latency from 3 calls → 1 call                          |
| **Database-level Atomicity** | All-or-nothing guarantee via PostgreSQL ACID                  |
| **Pessimistic Locking**      | Seats locked while checking → prevent concurrent modification |
| **Automatic Rollback**       | Failed step = entire transaction rolled back                  |
| **Consistent Data**          | No orphaned bookings or held seats                            |

---

## Database Changes

### 1. Create RPC Function

**File to Create**:
`supabase/migrations/20260522_[timestamp]_atomic_booking.sql`

```sql
-- ============================================================
-- ATOMIC BOOKING CREATION WITH TRANSACTION
-- ============================================================
-- This RPC function ensures all booking steps happen atomically.
-- If any step fails, the entire transaction is rolled back.
--
-- Usage: SELECT atomic_create_booking(...)
--
-- Returns: JSON object with:
--   - booking_id: UUID of created booking
--   - code: Confirmation code (e.g., "PYVXK7")
--   - total: Total amount (price * seat count)
--   - schedule_info: Details about the schedule
-- ============================================================

CREATE OR REPLACE FUNCTION public.atomic_create_booking(
  p_user_id UUID,
  p_schedule_id UUID,
  p_seat_ids UUID[],
  p_passenger_name TEXT,
  p_passenger_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_code TEXT;
  v_total NUMERIC;
  v_price NUMERIC;
  v_seats_count INT;
  v_available_count INT;
  v_seats_row seats;
  v_now TIMESTAMPTZ;
  v_hold_until TIMESTAMPTZ;
BEGIN
  -- ============================================================
  -- 1. VALIDATION & SETUP
  -- ============================================================
  
  v_now := NOW() AT TIME ZONE 'Asia/Jakarta';
  v_hold_until := v_now + INTERVAL '10 minutes';
  v_seats_count := array_length(p_seat_ids, 1);
  
  -- Validate inputs
  IF v_seats_count IS NULL OR v_seats_count = 0 THEN
    RAISE EXCEPTION 'booking_error: Tidak ada kursi yang dipilih';
  END IF;
  
  IF v_seats_count > 8 THEN
    RAISE EXCEPTION 'booking_error: Maksimal 8 kursi per pesanan';
  END IF;
  
  IF p_passenger_name IS NULL OR p_passenger_name = '' THEN
    RAISE EXCEPTION 'booking_error: Nama penumpang diperlukan';
  END IF;
  
  IF p_passenger_phone IS NULL OR p_passenger_phone = '' THEN
    RAISE EXCEPTION 'booking_error: Nomor telepon diperlukan';
  END IF;

  -- ============================================================
  -- 2. FETCH SCHEDULE & VERIFY IT EXISTS
  -- ============================================================
  
  SELECT price INTO v_price
  FROM schedules
  WHERE id = p_schedule_id;
  
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'booking_error: Jadwal tidak ditemukan';
  END IF;
  
  -- ============================================================
  -- 3. VERIFY SEATS EXIST & ARE AVAILABLE
  -- ============================================================
  -- Using FOR UPDATE NOWAIT to lock seats immediately.
  -- If another transaction is already holding these seats,
  -- this will fail instantly (better UX than waiting).
  
  BEGIN
    SELECT COUNT(*) INTO v_available_count
    FROM seats
    WHERE id = ANY(p_seat_ids)
      AND schedule_id = p_schedule_id
      AND status = 'available'
    FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RAISE EXCEPTION 'booking_error: Kursi sedang diproses oleh pengguna lain. Silakan coba ulang.';
  END;
  
  -- Verify all requested seats are available
  IF v_available_count != v_seats_count THEN
    RAISE EXCEPTION 'booking_error: Sebagian kursi sudah tidak tersedia. Tersedia: %/%', 
      v_available_count, v_seats_count;
  END IF;

  -- ============================================================
  -- 4. GENERATE BOOKING CODE
  -- ============================================================
  -- Use MD5 of random + current timestamp for better uniqueness
  -- than simple random string
  
  v_code := 'PYU' || SUBSTR(
    MD5(
      random()::text || 
      clock_timestamp()::text ||
      p_user_id::text
    ), 
    1, 6
  );

  -- ============================================================
  -- 5. CREATE BOOKING RECORD
  -- ============================================================
  
  v_total := v_price * v_seats_count;
  
  INSERT INTO bookings (
    user_id,
    schedule_id,
    code,
    status,
    total,
    passenger_name,
    passenger_phone,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_schedule_id,
    v_code,
    'pending',
    v_total,
    p_passenger_name,
    p_passenger_phone,
    v_now,
    v_now
  )
  RETURNING id INTO v_booking_id;

  -- ============================================================
  -- 6. HOLD SEATS
  -- ============================================================
  
  UPDATE seats
  SET
    status = 'held',
    hold_until = v_hold_until,
    updated_at = v_now
  WHERE id = ANY(p_seat_ids)
    AND schedule_id = p_schedule_id;

  -- ============================================================
  -- 7. LINK SEATS TO BOOKING
  -- ============================================================
  
  INSERT INTO seat_bookings (
    booking_id,
    seat_id,
    passenger_name,
    created_at
  )
  SELECT
    v_booking_id,
    s,
    p_passenger_name,
    v_now
  FROM UNNEST(p_seat_ids) AS s;

  -- ============================================================
  -- 8. RETURN RESULT
  -- ============================================================
  
  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'code', v_code,
    'total', v_total,
    'seats_count', v_seats_count,
    'status', 'pending'
  );

EXCEPTION WHEN OTHERS THEN
  -- PostgreSQL will automatically ROLLBACK the transaction
  -- Log the error for debugging
  RAISE EXCEPTION 'booking_error: %', SQLERRM;
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
-- This function runs with SECURITY DEFINER (as superuser),
-- so callers don't need direct table permissions.

GRANT EXECUTE ON FUNCTION public.atomic_create_booking(
  UUID, UUID, UUID[], TEXT, TEXT
) TO authenticated;

-- ============================================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================================
-- Help the SELECT query in step 3 find seats quickly

CREATE INDEX IF NOT EXISTS idx_seats_schedule_available
ON seats(schedule_id, status)
WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_bookings_user_created
ON bookings(user_id, created_at DESC);

-- ============================================================
-- COMMENT FOR DOCUMENTATION
-- ============================================================

COMMENT ON FUNCTION public.atomic_create_booking(
  UUID, UUID, UUID[], TEXT, TEXT
) IS 'Creates a booking atomically with seat allocation. All steps succeed or all rollback.';
```

### 2. Migration File Metadata

**Filename Format**: `20260522_[HHMMSS]_atomic_booking.sql`

Example: `20260522_143022_atomic_booking.sql`

**Why**:

- Date prefix: Track when migration was created
- Timestamp: Ensure unique order even if multiple created same day
- Supabase auto-runs migrations in alphabetical order

---

## Application Code Changes

### 1. Update Server Function

**File to Modify**: `src/features/booking/services/bookings.functions.ts`

```typescript
// ============================================================
// OLD IMPLEMENTATION (DELETE)
// ============================================================
// export const createBooking = createServerFn({ method: "POST" })
//   .middleware([requireSupabaseAuth])
//   .inputValidator(...)
//   .handler(async ({ data, context }) => {
//     // Multiple non-atomic steps (DEPRECATED)
//   });

// ============================================================
// NEW IMPLEMENTATION (REPLACE)
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * ATOMIC BOOKING CREATION
 *
 * This server function calls a PostgreSQL RPC that handles
 * all booking steps in a single transaction. If any step fails,
 * the entire transaction is rolled back.
 *
 * Steps:
 * 1. Validate inputs
 * 2. Fetch schedule & verify exists
 * 3. Lock & verify seats available
 * 4. Generate booking code
 * 5. Create booking record
 * 6. Hold seats
 * 7. Link seats to booking
 *
 * @param scheduleId - UUID of the schedule to book
 * @param seatIds - Array of seat UUIDs to book (1-8 seats)
 * @param passengerName - Name for booking confirmation
 * @param passengerPhone - Phone for booking confirmation
 *
 * @returns {Object} bookingId, confirmation code, and total amount
 * @throws {Error} If seats unavailable, validation fails, or transaction fails
 *
 * @example
 * const result = await createBooking({
 *   scheduleId: "123e4567-e89b-12d3-a456-426614174000",
 *   seatIds: ["seat-1", "seat-2"],
 *   passengerName: "Budi Santoso",
 *   passengerPhone: "+62811223344"
 * });
 * // Returns: { bookingId: "...", code: "PYVXK7", total: 600000 }
 */
export const createBooking = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((data: unknown) => {
        return z.object({
            scheduleId: z
                .string()
                .uuid("Schedule ID harus UUID yang valid"),
            seatIds: z
                .array(z.string().uuid("Setiap seat ID harus UUID yang valid"))
                .min(1, "Minimal 1 kursi harus dipilih")
                .max(8, "Maksimal 8 kursi per pesanan"),
            passengerName: z
                .string()
                .min(1, "Nama penumpang diperlukan")
                .max(120, "Nama maksimal 120 karakter"),
            passengerPhone: z
                .string()
                .min(6, "Nomor telepon minimal 6 digit")
                .max(30, "Nomor telepon maksimal 30 karakter")
                .regex(/^[\d+\s\-()]+$/, "Format nomor telepon tidak valid"),
        }).parse(data);
    })
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;

        try {
            // ============================================================
            // CALL RPC FUNCTION FOR ATOMIC BOOKING
            // ============================================================
            // This single call handles all booking steps in a transaction.
            // The database guarantees ACID properties.

            const { data: result, error } = await supabase.rpc(
                "atomic_create_booking",
                {
                    p_user_id: userId,
                    p_schedule_id: data.scheduleId,
                    p_seat_ids: data.seatIds,
                    p_passenger_name: data.passengerName,
                    p_passenger_phone: data.passengerPhone,
                },
            );

            // ============================================================
            // ERROR HANDLING
            // ============================================================

            if (error) {
                // RPC errors include context about what failed
                const errorMessage = error.message || "Gagal membuat booking";

                // Parse structured error messages from database
                if (errorMessage.includes("booking_error:")) {
                    const userMessage = errorMessage.replace(
                        "booking_error:",
                        "",
                    ).trim();
                    throw new Error(userMessage);
                }

                // Generic error fallback
                console.error("[createBooking] RPC Error:", {
                    scheduleId: data.scheduleId,
                    seatCount: data.seatIds.length,
                    error: error.message,
                    code: error.code,
                });

                throw new Error(
                    "Terjadi kesalahan saat membuat booking. Silakan coba lagi.",
                );
            }

            if (!result) {
                throw new Error(
                    "Booking tidak dapat dibuat. Response kosong dari server.",
                );
            }

            // ============================================================
            // SUCCESS RESPONSE
            // ============================================================

            return {
                bookingId: result.booking_id,
                code: result.code,
                total: result.total,
                seatsCount: result.seats_count,
                status: result.status,
            };
        } catch (error: any) {
            // Log untuk debugging (frontend akan receive generic message)
            console.error("[createBooking] Error:", {
                userId,
                scheduleId: data.scheduleId,
                seatCount: data.seatIds.length,
                error: error.message,
                stack: error.stack,
            });

            // Re-throw dengan user-friendly message
            throw error;
        }
    });

// ============================================================
// REMAINING FUNCTIONS (UNCHANGED)
// ============================================================

export const listMyBookings = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
        const { supabase, userId } = context;
        const { data, error } = await supabase
            .from("bookings")
            .select(
                "*, schedules(*, vehicles(*), pickup_points(*)), seat_bookings(*, seats(seat_no))",
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
    });

export const getBooking = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d: { id: string }) =>
        z.object({ id: z.string().uuid() }).parse(d)
    )
    .handler(async ({ data, context }) => {
        const { supabase } = context;
        const { data: b, error } = await supabase
            .from("bookings")
            .select(
                "*, schedules(*, vehicles(*), pickup_points(*)), seat_bookings(*, seats(seat_no))",
            )
            .eq("id", data.id)
            .single();
        if (error) throw error;
        return b;
    });
```

### 2. Type Definition Updates

**File to Modify**: `src/integrations/supabase/types.ts`

Add RPC function type if using generated types:

```typescript
// Add to types.ts
export type RpcFunctionReturnType = {
    booking_id: string;
    code: string;
    total: number;
    seats_count: number;
    status: "pending";
};

// Or if using full Database type generation:
declare global {
    namespace PostgrestRPC {
        interface Database {
            public: {
                Functions: {
                    atomic_create_booking: {
                        Args: {
                            p_user_id: string;
                            p_schedule_id: string;
                            p_seat_ids: string[];
                            p_passenger_name: string;
                            p_passenger_phone: string;
                        };
                        Returns: {
                            booking_id: string;
                            code: string;
                            total: number;
                            seats_count: number;
                            status: "pending";
                        };
                    };
                };
            };
        }
    }
}
```

---

## Testing Strategy

### 1. Unit Test: RPC Function

**File to Create**: `tests/unit/booking-atomicity.test.ts`

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // Use service key for direct DB access
);

describe("Booking Atomicity - RPC Function", () => {
    let scheduleId: string;
    let testSeatIds: string[];
    let testUserId: string;

    beforeAll(async () => {
        // Setup test data
        const { data: schedule } = await supabase
            .from("schedules")
            .select("id")
            .limit(1)
            .single();

        scheduleId = schedule!.id;

        const { data: seats } = await supabase
            .from("seats")
            .select("id")
            .eq("schedule_id", scheduleId)
            .eq("status", "available")
            .limit(2);

        testSeatIds = seats!.map((s) => s.id);
        testUserId = crypto.randomUUID();
    });

    afterAll(async () => {
        // Cleanup: Delete test bookings
        await supabase
            .from("bookings")
            .delete()
            .eq("user_id", testUserId);
    });

    it("Should create booking with all steps atomic", async () => {
        const { data, error } = await supabase.rpc(
            "atomic_create_booking",
            {
                p_user_id: testUserId,
                p_schedule_id: scheduleId,
                p_seat_ids: testSeatIds,
                p_passenger_name: "Test User",
                p_passenger_phone: "+628123456789",
            },
        );

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data?.booking_id).toBeDefined();
        expect(data?.code).toMatch(/^PYU[A-Z0-9]{6}$/);
        expect(data?.total).toBeGreaterThan(0);
    });

    it("Should reject booking with non-existent schedule", async () => {
        const fakeScheduleId = crypto.randomUUID();

        const { data, error } = await supabase.rpc(
            "atomic_create_booking",
            {
                p_user_id: testUserId,
                p_schedule_id: fakeScheduleId,
                p_seat_ids: testSeatIds,
                p_passenger_name: "Test User",
                p_passenger_phone: "+628123456789",
            },
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain("Jadwal tidak ditemukan");
    });

    it("Should reject with unavailable seats", async () => {
        // First booking holds the seats
        await supabase.rpc("atomic_create_booking", {
            p_user_id: testUserId,
            p_schedule_id: scheduleId,
            p_seat_ids: testSeatIds,
            p_passenger_name: "User 1",
            p_passenger_phone: "+628123456789",
        });

        // Second booking with same seats should fail
        const { data, error } = await supabase.rpc(
            "atomic_create_booking",
            {
                p_user_id: crypto.randomUUID(),
                p_schedule_id: scheduleId,
                p_seat_ids: testSeatIds,
                p_passenger_name: "User 2",
                p_passenger_phone: "+628123456789",
            },
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain("tidak tersedia");
    });

    it("Should handle concurrent bookings without double-booking", async () => {
        // Get 4 available seats
        const { data: availableSeats } = await supabase
            .from("seats")
            .select("id")
            .eq("schedule_id", scheduleId)
            .eq("status", "available")
            .limit(4);

        const [seat1, seat2, seat3, seat4] = availableSeats!.map((s) => s.id);

        // Simulate 2 concurrent bookings
        const result = await Promise.allSettled([
            supabase.rpc("atomic_create_booking", {
                p_user_id: crypto.randomUUID(),
                p_schedule_id: scheduleId,
                p_seat_ids: [seat1, seat2],
                p_passenger_name: "User A",
                p_passenger_phone: "+628111111111",
            }),
            supabase.rpc("atomic_create_booking", {
                p_user_id: crypto.randomUUID(),
                p_schedule_id: scheduleId,
                p_seat_ids: [seat3, seat4],
                p_passenger_name: "User B",
                p_passenger_phone: "+628222222222",
            }),
        ]);

        // Both should succeed
        expect(result[0].status).toBe("fulfilled");
        expect(result[1].status).toBe("fulfilled");
    });

    it("Should validate input constraints", async () => {
        // Test: Too many seats
        const { error: tooManyError } = await supabase.rpc(
            "atomic_create_booking",
            {
                p_user_id: testUserId,
                p_schedule_id: scheduleId,
                p_seat_ids: new Array(10).fill(crypto.randomUUID()), // 10 seats
                p_passenger_name: "User",
                p_passenger_phone: "+628123456789",
            },
        );

        expect(tooManyError).toBeDefined();
        expect(tooManyError?.message).toContain("Maksimal");
    });
});
```

### 2. Integration Test: Server Function

**File to Create**: `tests/integration/create-booking.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { createBooking } from "@/features/booking/services/bookings.functions";

describe("createBooking - Server Function", () => {
    it("Should call RPC and return booking details", async () => {
        const context = {
            supabase: createMockSupabase(),
            userId: "test-user-123",
        };

        const result = await createBooking(
            {
                scheduleId: "schedule-123",
                seatIds: ["seat-1", "seat-2"],
                passengerName: "Budi Santoso",
                passengerPhone: "+62811223344",
            },
            context,
        );

        expect(result.bookingId).toBeDefined();
        expect(result.code).toMatch(/^PYU/);
        expect(result.total).toBeGreaterThan(0);
    });

    it("Should handle RPC errors gracefully", async () => {
        const mockSupabase = createMockSupabase({
            rpcError: "Jadwal tidak ditemukan",
        });

        const context = {
            supabase: mockSupabase,
            userId: "test-user-123",
        };

        await expect(
            createBooking(
                {
                    scheduleId: "invalid-schedule",
                    seatIds: ["seat-1"],
                    passengerName: "Budi",
                    passengerPhone: "+62811223344",
                },
                context,
            ),
        ).rejects.toThrow("Jadwal tidak ditemukan");
    });

    it("Should validate input before calling RPC", async () => {
        const context = {
            supabase: createMockSupabase(),
            userId: "test-user-123",
        };

        await expect(
            createBooking(
                {
                    scheduleId: "invalid-uuid", // Invalid UUID format
                    seatIds: ["seat-1"],
                    passengerName: "Budi",
                    passengerPhone: "+62811223344",
                },
                context,
            ),
        ).rejects.toThrow("Schedule ID harus UUID");
    });
});
```

### 3. Load Test: Concurrent Bookings

**File to Create**: `tests/load/concurrent-bookings.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createBooking } from '@/features/booking/services/bookings.functions';

describe('Concurrent Booking Performance', () => {
  it('Should handle 50 concurrent bookings without race conditions', async () => {
    const scheduleId = 'schedule-123';  // Use fixture
    const contextTemplate = {
      supabase: createMockSupabase(),
      // userId varies per request
    };

    // Create 50 concurrent booking requests
    const requests = Array.from({ length: 50 }, (_, i) => 
      createBooking(
        {
          scheduleId,
          seatIds: [`seat-${i}`],  // Each user books different seat
          passengerName: `User ${i}`,
          passengerPhone: `+6281234567${String(i).padStart(2, '0')}`,
        },
        {
          ...contextTemplate,
          userId: `user-${i}`,
        }
      )
    );

    const startTime = Date.now();
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();

    // All should succeed
    const successes = results.filter((r) => r.status === 'fulfilled');
    expect(successes.length).toBe(50);

    // Performance check: Should complete in < 5 seconds
    expect(endTime - startTime).toBeLessThan(5000);

    // Verify no bookings created with same seats
    const usedSeats = new Set();
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const booking = result.value;
        expect(usedSeats.has(booking.bookingId)).toBe(false);
        usedSeats.add(booking.bookingId);
      }
    }
  });

  it('Should fail gracefully when seats exhausted', async () => {
    const scheduleId = 'schedule-limited';  // Only 10 seats available
    const requests = Array.from({ length: 20 }, (_, i) => 
      createBooking({...})  // Try to book 20 times
    );

    const results = await Promise.allSettled(requests);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Should have ~10 successes and ~10 failures
    expect(successes.length).toBeLessThanOrEqual(10);
    expect(failures.length).toBeGreaterThan(0);

    // Failures should have clear error message
    for (const failure of failures) {
      if (failure.status === 'rejected') {
        expect(failure.reason.message).toContain('tidak tersedia');
      }
    }
  });
});
```

---

## Deployment Plan

### Phase 1: Database Migration (Downtime: ~1 minute)

```bash
# Step 1: Run migration locally to test
supabase migration up

# Step 2: Deploy to staging
supabase db push --linked-project-ref staging

# Step 3: Verify RPC function exists
# SELECT proname FROM pg_proc WHERE proname = 'atomic_create_booking';

# Step 4: Test RPC with sample data
supabase sql << 'EOF'
SELECT atomic_create_booking(
  'user-123'::uuid,
  'schedule-456'::uuid,
  ARRAY['seat-1', 'seat-2']::uuid[],
  'Test User',
  '+62811223344'
);
EOF

# Step 5: Deploy to production during low-traffic window
supabase db push --linked-project-ref production

# Step 6: Verify production RPC function
SELECT COUNT(*) FROM pg_proc WHERE proname = 'atomic_create_booking';
```

### Phase 2: Code Deployment (Zero Downtime)

```bash
# Step 1: Create feature branch
git checkout -b feat/booking-atomicity

# Step 2: Update server function
# Modify: src/features/booking/services/bookings.functions.ts

# Step 3: Run tests locally
npm run test:unit tests/unit/booking-atomicity.test.ts
npm run test:integration tests/integration/create-booking.test.ts

# Step 4: Deploy to staging
npm run build
npm run deploy:staging

# Step 5: Run E2E tests on staging
npm run test:e2e:staging

# Step 6: Deploy to production (gradual rollout)
npm run deploy:production --gradual 10%  # 10% traffic initially
npm run deploy:production --gradual 50%  # 50% after 30 minutes
npm run deploy:production --gradual 100% # 100% after 1 hour
```

### Phase 3: Monitoring & Verification

```bash
# Monitor error rates
# Query from Sentry/LogRocket:
# - Look for "booking_error:" messages
# - Track RPC execution time (should be < 200ms p95)
# - Monitor seat hold cleanup job

# Check metrics
curl https://api.example.com/metrics | grep booking_

# Verify data consistency
SELECT COUNT(*) FROM bookings WHERE id NOT IN (
  SELECT booking_id FROM seat_bookings
);
-- Should return 0
```

---

## Rollback Procedure

### If RPC Function Has Issues

```sql
-- Option 1: Quick rollback to old server function code
-- (Keep RPC, just don't call it from new code)

-- Revert to old createBooking implementation
-- git checkout HEAD~1 -- src/features/booking/services/bookings.functions.ts
-- npm run deploy:production --force-revert

-- Option 2: Full rollback (remove RPC)
DROP FUNCTION IF EXISTS public.atomic_create_booking(
  UUID, UUID, UUID[], TEXT, TEXT
);
DROP INDEX IF EXISTS idx_seats_schedule_available;
DROP INDEX IF EXISTS idx_bookings_user_created;

-- Revert database migration
supabase migration down
```

### If Booking Flow Breaks

1. **Immediate**: Disable booking feature flag
   ```typescript
   if (!process.env.BOOKINGS_ENABLED) {
       throw new Error("Booking temporarily disabled for maintenance");
   }
   ```

2. **Wait**: Monitor error logs for 5 minutes

3. **Decide**:
   - If recoverable: Hotfix + redeploy
   - If not: Full rollback to previous commit

4. **Verify**: Check data integrity
   ```sql
   -- Orphaned bookings without seats?
   SELECT * FROM bookings WHERE id NOT IN (
     SELECT booking_id FROM seat_bookings
   );

   -- Held seats without bookings?
   SELECT * FROM seats WHERE status = 'held' AND hold_until < NOW();
   ```

---

## Acceptance Criteria

### ✅ Functional Requirements

- [ ] RPC function `atomic_create_booking()` created and callable
- [ ] Server function updated to call RPC instead of multi-step booking
- [ ] All booking steps (seat lock → create booking → link seats) happen
      atomically
- [ ] Error messages from database surface to client in user-friendly format
- [ ] Input validation enforced (phone format, name length, seat count)

### ✅ Performance Requirements

- [ ] Booking creation time < 500ms (p95)
- [ ] RPC execution time < 200ms (p95)
- [ ] No performance degradation vs. old implementation
- [ ] Handles 50+ concurrent bookings without errors

### ✅ Data Integrity Requirements

- [ ] Zero double-bookings when concurrent requests use same seats
- [ ] No orphaned bookings (all have linked seats)
- [ ] No orphaned held seats (all linked to valid bookings)
- [ ] All bookings have unique confirmation codes

### ✅ Testing Requirements

- [ ] Unit tests for RPC function (6+ test cases)
- [ ] Integration tests for server function (3+ test cases)
- [ ] Load tests for concurrent scenarios (2+ test cases)
- [ ] All tests passing (100% pass rate)
- [ ] Edge cases covered (invalid input, race conditions, timeouts)

### ✅ Code Quality Requirements

- [ ] TypeScript strict mode: No `any` types
- [ ] ESLint: Zero errors
- [ ] Comments: Explain transaction flow & error handling
- [ ] Code review: Approved by 2 senior developers

### ✅ Deployment Requirements

- [ ] Database migration tested in staging
- [ ] Code tested in staging environment (1 day minimum)
- [ ] Monitoring/alerting configured for error rates
- [ ] Rollback plan documented and tested
- [ ] Zero booking failures during rollout

### ✅ Documentation Requirements

- [ ] RPC function documented (comments + README)
- [ ] Server function JSDoc comments updated
- [ ] Error codes documented
- [ ] Deployment procedure documented

---

## Success Metrics (Post-Deployment)

Track these metrics for 1 week after deployment:

| Metric                   | Target  | Measurement                           |
| ------------------------ | ------- | ------------------------------------- |
| Booking Success Rate     | > 99.9% | Bookings created / Bookings attempted |
| Double-Booking Incidents | = 0     | Count of duplicate seat bookings      |
| RPC Execution Time (p95) | < 200ms | Query execution time from logs        |
| Error Rate               | < 0.1%  | Errors / Total requests               |
| User Satisfaction        | > 4.5/5 | Support feedback scores               |

---

## FAQ & Troubleshooting

**Q: Why use RPC instead of SDK?**\
A: RPC guarantees atomicity via PostgreSQL transactions. SDK calls are
inherently non-atomic.

**Q: Can we use `BEGIN`/`COMMIT` instead of RPC?**\
A: TanStack Start doesn't support raw SQL transactions. RPC is the idiomatic
Supabase approach.

**Q: What if RPC fails halfway?**\
A: PostgreSQL automatically ROLLBACK. Seats remain 'available', booking doesn't
exist.

**Q: How do we test concurrent bookings locally?**\
A: Use `Promise.allSettled()` to simulate 50+ simultaneous requests.

**Q: Can clients bypass the RPC?**\
A: No. Direct table access is restricted by RLS policies. Only authenticated
users can call RPC.

---

**Prepared by**: Architecture Team\
**Date**: 22 Mei 2026\
**Status**: Ready for Implementation\
**Approvals Needed**: Tech Lead, Database Admin
