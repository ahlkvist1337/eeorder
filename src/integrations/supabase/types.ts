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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      article_rows: {
        Row: {
          id: string
          object_id: string | null
          order_id: string
          part_number: string
          price: number
          quantity: number
          row_number: string
          step_id: string | null
          text: string
          unit: string
        }
        Insert: {
          id?: string
          object_id?: string | null
          order_id: string
          part_number: string
          price?: number
          quantity?: number
          row_number: string
          step_id?: string | null
          text: string
          unit?: string
        }
        Update: {
          id?: string
          object_id?: string | null
          order_id?: string
          part_number?: string
          price?: number
          quantity?: number
          row_number?: string
          step_id?: string | null
          text?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_rows_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "order_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_rows_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      object_templates: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      object_trucks: {
        Row: {
          created_at: string
          id: string
          object_id: string
          sort_order: number | null
          status: Database["public"]["Enums"]["truck_status"]
          truck_number: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          object_id: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["truck_status"]
          truck_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          object_id?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["truck_status"]
          truck_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_trucks_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "order_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          order_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          order_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_deviations: {
        Row: {
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          message: string
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_name: string
          id?: string
          message: string
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_name?: string
          id?: string
          message?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_deviations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_objects: {
        Row: {
          completed_quantity: number
          created_at: string
          description: string | null
          id: string
          name: string
          order_id: string
          planned_quantity: number
          received_quantity: number
        }
        Insert: {
          completed_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_id: string
          planned_quantity?: number
          received_quantity?: number
        }
        Update: {
          completed_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_id?: string
          planned_quantity?: number
          received_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_objects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_steps: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          id: string
          name: string
          object_id: string | null
          order_id: string
          planned_end: string | null
          planned_start: string | null
          price: number | null
          status: Database["public"]["Enums"]["step_status"]
          template_id: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          id?: string
          name: string
          object_id?: string | null
          order_id: string
          planned_end?: string | null
          planned_start?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["step_status"]
          template_id: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          id?: string
          name?: string
          object_id?: string | null
          order_id?: string
          planned_end?: string | null
          planned_start?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["step_status"]
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_steps_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "order_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_steps_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          billing_status: Database["public"]["Enums"]["billing_status"]
          comment: string | null
          created_at: string
          customer: string
          customer_reference: string | null
          delivery_address: string | null
          deviation_comment: string | null
          has_deviation: boolean
          id: string
          instructions: Json | null
          order_number: string
          planned_end: string | null
          planned_start: string | null
          production_status: Database["public"]["Enums"]["production_status"]
          total_price: number
          updated_at: string
          xml_data: Json | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          billing_status?: Database["public"]["Enums"]["billing_status"]
          comment?: string | null
          created_at?: string
          customer: string
          customer_reference?: string | null
          delivery_address?: string | null
          deviation_comment?: string | null
          has_deviation?: boolean
          id?: string
          instructions?: Json | null
          order_number: string
          planned_end?: string | null
          planned_start?: string | null
          production_status?: Database["public"]["Enums"]["production_status"]
          total_price?: number
          updated_at?: string
          xml_data?: Json | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          billing_status?: Database["public"]["Enums"]["billing_status"]
          comment?: string | null
          created_at?: string
          customer?: string
          customer_reference?: string | null
          delivery_address?: string | null
          deviation_comment?: string | null
          has_deviation?: boolean
          id?: string
          instructions?: Json | null
          order_number?: string
          planned_end?: string | null
          planned_start?: string | null
          production_status?: Database["public"]["Enums"]["production_status"]
          total_price?: number
          updated_at?: string
          xml_data?: Json | null
        }
        Relationships: []
      }
      price_list: {
        Row: {
          created_at: string
          description: string
          id: string
          part_number: string
          price: number
          step_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          part_number: string
          price?: number
          step_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          part_number?: string
          price?: number
          step_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      status_history: {
        Row: {
          from_status: Database["public"]["Enums"]["production_status"]
          id: string
          order_id: string
          timestamp: string
          to_status: Database["public"]["Enums"]["production_status"]
        }
        Insert: {
          from_status: Database["public"]["Enums"]["production_status"]
          id?: string
          order_id: string
          timestamp?: string
          to_status: Database["public"]["Enums"]["production_status"]
        }
        Update: {
          from_status?: Database["public"]["Enums"]["production_status"]
          id?: string
          order_id?: string
          timestamp?: string
          to_status?: Database["public"]["Enums"]["production_status"]
        }
        Relationships: [
          {
            foreignKeyName: "status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      step_status_history: {
        Row: {
          from_status: Database["public"]["Enums"]["step_status"]
          id: string
          order_id: string
          step_id: string
          step_name: string
          timestamp: string
          to_status: Database["public"]["Enums"]["step_status"]
        }
        Insert: {
          from_status: Database["public"]["Enums"]["step_status"]
          id?: string
          order_id: string
          step_id: string
          step_name: string
          timestamp?: string
          to_status: Database["public"]["Enums"]["step_status"]
        }
        Update: {
          from_status?: Database["public"]["Enums"]["step_status"]
          id?: string
          order_id?: string
          step_id?: string
          step_name?: string
          timestamp?: string
          to_status?: Database["public"]["Enums"]["step_status"]
        }
        Relationships: [
          {
            foreignKeyName: "step_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_step_templates: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      truck_lifecycle_events: {
        Row: {
          event_type: string
          id: string
          note: string | null
          order_id: string
          step_name: string | null
          timestamp: string
          truck_id: string
          truck_number: string | null
        }
        Insert: {
          event_type: string
          id?: string
          note?: string | null
          order_id: string
          step_name?: string | null
          timestamp?: string
          truck_id: string
          truck_number?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          note?: string | null
          order_id?: string
          step_name?: string | null
          timestamp?: string
          truck_id?: string
          truck_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_lifecycle_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_lifecycle_events_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "object_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_status_history: {
        Row: {
          from_status: Database["public"]["Enums"]["step_status"]
          id: string
          order_id: string
          step_id: string
          step_name: string
          timestamp: string
          to_status: Database["public"]["Enums"]["step_status"]
          truck_id: string
          truck_number: string
        }
        Insert: {
          from_status: Database["public"]["Enums"]["step_status"]
          id?: string
          order_id: string
          step_id: string
          step_name: string
          timestamp?: string
          to_status: Database["public"]["Enums"]["step_status"]
          truck_id: string
          truck_number: string
        }
        Update: {
          from_status?: Database["public"]["Enums"]["step_status"]
          id?: string
          order_id?: string
          step_id?: string
          step_name?: string
          timestamp?: string
          to_status?: Database["public"]["Enums"]["step_status"]
          truck_id?: string
          truck_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_status_history_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "order_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_status_history_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "object_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_step_status: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          id: string
          status: Database["public"]["Enums"]["step_status"]
          step_id: string
          truck_id: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          id?: string
          status?: Database["public"]["Enums"]["step_status"]
          step_id: string
          truck_id: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          id?: string
          status?: Database["public"]["Enums"]["step_status"]
          step_id?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_step_status_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "order_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_step_status_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "object_trucks"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_production_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "redigera" | "lasa" | "utforare" | "produktion"
      billing_status: "not_ready" | "ready_for_billing" | "billed"
      production_status:
        | "created"
        | "planned"
        | "started"
        | "paused"
        | "arrived"
        | "completed"
        | "cancelled"
      step_status: "pending" | "in_progress" | "completed"
      truck_status: "waiting" | "arrived" | "started" | "paused" | "completed"
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
      app_role: ["admin", "redigera", "lasa", "utforare", "produktion"],
      billing_status: ["not_ready", "ready_for_billing", "billed"],
      production_status: [
        "created",
        "planned",
        "started",
        "paused",
        "arrived",
        "completed",
        "cancelled",
      ],
      step_status: ["pending", "in_progress", "completed"],
      truck_status: ["waiting", "arrived", "started", "paused", "completed"],
    },
  },
} as const
