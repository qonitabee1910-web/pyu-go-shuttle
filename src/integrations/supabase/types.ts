export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          code: string
          created_at: string
          id: string
          passenger_name: string | null
          passenger_phone: string | null
          promo_code: string | null
          schedule_id: string
          status: Database["public"]["Enums"]["booking_status"]
          total: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          passenger_name?: string | null
          passenger_phone?: string | null
          promo_code?: string | null
          schedule_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          total: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          passenger_name?: string | null
          passenger_phone?: string | null
          promo_code?: string | null
          schedule_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          lat: number
          lng: number
          updated_at: string
        }
        Insert: {
          driver_id: string
          heading?: number | null
          lat: number
          lng: number
          updated_at?: string
        }
        Update: {
          driver_id?: string
          heading?: number | null
          lat?: number
          lng?: number
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          license_no: string | null
          rating: number
          status: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          license_no?: string | null
          rating?: number
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          license_no?: string | null
          rating?: number
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          external_id: string | null
          id: string
          method: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          method?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          method?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_points: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string
          distance_km: number | null
          eta_min: number | null
          id: string
          lat: number
          lng: number
          name: string
          rayon: string | null
          route_id: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          distance_km?: number | null
          eta_min?: number | null
          id?: string
          lat: number
          lng: number
          name: string
          rayon?: string | null
          route_id?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          distance_km?: number | null
          eta_min?: number | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          rayon?: string | null
          route_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_points_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      ride_orders: {
        Row: {
          created_at: string
          driver_id: string | null
          dropoff: Json
          eta_min: number | null
          fare: number
          id: string
          pickup: Json
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          user_id: string
          vehicle_meta: Json | null
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          dropoff: Json
          eta_min?: number | null
          fare: number
          id?: string
          pickup: Json
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          user_id: string
          vehicle_meta?: Json | null
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          dropoff?: Json
          eta_min?: number | null
          fare?: number
          id?: string
          pickup?: Json
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          user_id?: string
          vehicle_meta?: Json | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          active: boolean
          created_at: string
          destination: string
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number | null
          id: string
          origin: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          destination: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          id?: string
          origin: string
        }
        Update: {
          active?: boolean
          created_at?: string
          destination?: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          id?: string
          origin?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          active: boolean
          arrival_at: string | null
          created_at: string
          departure_at: string
          id: string
          pickup_point_id: string
          price: number
          route_id: string
          seats_total: number
          tier: Database["public"]["Enums"]["vehicle_tier"]
          vehicle_id: string
        }
        Insert: {
          active?: boolean
          arrival_at?: string | null
          created_at?: string
          departure_at: string
          id?: string
          pickup_point_id: string
          price: number
          route_id: string
          seats_total: number
          tier?: Database["public"]["Enums"]["vehicle_tier"]
          vehicle_id: string
        }
        Update: {
          active?: boolean
          arrival_at?: string | null
          created_at?: string
          departure_at?: string
          id?: string
          pickup_point_id?: string
          price?: number
          route_id?: string
          seats_total?: number
          tier?: Database["public"]["Enums"]["vehicle_tier"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_bookings: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          passenger_name: string | null
          seat_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          passenger_name?: string | null
          seat_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          passenger_name?: string | null
          seat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_bookings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_bookings_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: true
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          hold_until: string | null
          id: string
          schedule_id: string
          seat_no: string
          status: Database["public"]["Enums"]["seat_status"]
          updated_at: string
        }
        Insert: {
          hold_until?: string | null
          id?: string
          schedule_id: string
          seat_no: string
          status?: Database["public"]["Enums"]["seat_status"]
          updated_at?: string
        }
        Update: {
          hold_until?: string | null
          id?: string
          schedule_id?: string
          seat_no?: string
          status?: Database["public"]["Enums"]["seat_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seats_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          payment_id: string
          ref: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          payment_id: string
          ref: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          payment_id?: string
          ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_locations: {
        Row: {
          heading: number | null
          lat: number
          lng: number
          speed: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          heading?: number | null
          lat: number
          lng: number
          speed?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          heading?: number | null
          lat?: number
          lng?: number
          speed?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          id: string
          name: string
          plate: string
          seat_layout: Json
          type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          active?: boolean
          capacity: number
          created_at?: string
          id?: string
          name: string
          plate: string
          seat_layout?: Json
          type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          plate?: string
          seat_layout?: Json
          type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_match_ride_orders: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_expired_holds: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "driver" | "customer"
      booking_status: "pending" | "paid" | "boarded" | "completed" | "cancelled"
      payment_status: "pending" | "success" | "failed" | "refunded"
      ride_status:
        | "requested"
        | "accepted"
        | "ongoing"
        | "completed"
        | "cancelled"
      seat_status: "available" | "held" | "booked"
      vehicle_tier: "Reguler" | "SemiExecutive" | "Executive"
      vehicle_type: "hiace" | "suv" | "minicar"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "driver", "customer"],
      booking_status: ["pending", "paid", "boarded", "completed", "cancelled"],
      payment_status: ["pending", "success", "failed", "refunded"],
      ride_status: [
        "requested",
        "accepted",
        "ongoing",
        "completed",
        "cancelled",
      ],
      seat_status: ["available", "held", "booked"],
      vehicle_tier: ["Reguler", "SemiExecutive", "Executive"],
      vehicle_type: ["hiace", "suv", "minicar"],
    },
  },
} as const
