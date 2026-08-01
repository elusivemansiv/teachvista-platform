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
      course_views: {
        Row: {
          course_id: string
          id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          course_id: string
          id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          course_id?: string
          id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_views_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: Database["public"]["Enums"]["course_category"]
          created_at: string
          description: string
          duration_hours: number
          id: string
          is_published: boolean
          is_trending: boolean
          last_uploaded_at: string
          level: Database["public"]["Enums"]["course_level"]
          moderation_note: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          popularity: number
          preview_video_url: string | null
          rating: number
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          student_count: number
          submitted_at: string | null
          target_band: number | null
          teacher_id: string | null
          teacher_name: string
          thumbnail_url: string | null
          title: string
          views_count: number
        }
        Insert: {
          category: Database["public"]["Enums"]["course_category"]
          created_at?: string
          description: string
          duration_hours?: number
          id?: string
          is_published?: boolean
          is_trending?: boolean
          last_uploaded_at?: string
          level?: Database["public"]["Enums"]["course_level"]
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          popularity?: number
          preview_video_url?: string | null
          rating?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          student_count?: number
          submitted_at?: string | null
          target_band?: number | null
          teacher_id?: string | null
          teacher_name: string
          thumbnail_url?: string | null
          title: string
          views_count?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["course_category"]
          created_at?: string
          description?: string
          duration_hours?: number
          id?: string
          is_published?: boolean
          is_trending?: boolean
          last_uploaded_at?: string
          level?: Database["public"]["Enums"]["course_level"]
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          popularity?: number
          preview_video_url?: string | null
          rating?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          student_count?: number
          submitted_at?: string | null
          target_band?: number | null
          teacher_id?: string | null
          teacher_name?: string
          thumbnail_url?: string | null
          title?: string
          views_count?: number
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          last_lesson_id: string | null
          progress: number
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          last_lesson_id?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          last_lesson_id?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_watch_events: {
        Row: {
          completed: boolean
          course_id: string
          created_at: string
          id: string
          lesson_id: string
          occurred_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          course_id: string
          created_at?: string
          id?: string
          lesson_id: string
          occurred_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          occurred_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_watch_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_watch_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          draft_duration_min: number | null
          draft_title: string | null
          draft_video_url: string | null
          duration_min: number
          has_draft: boolean
          id: string
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          ordering: number
          publish_at: string | null
          status: Database["public"]["Enums"]["lesson_status"]
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          draft_duration_min?: number | null
          draft_title?: string | null
          draft_video_url?: string | null
          duration_min?: number
          has_draft?: boolean
          id?: string
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          ordering?: number
          publish_at?: string | null
          status?: Database["public"]["Enums"]["lesson_status"]
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          draft_duration_min?: number | null
          draft_title?: string | null
          draft_video_url?: string | null
          duration_min?: number
          has_draft?: boolean
          id?: string
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          ordering?: number
          publish_at?: string | null
          status?: Database["public"]["Enums"]["lesson_status"]
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_audit_log: {
        Row: {
          action: string
          actor_id: string
          actor_name: string | null
          course_id: string | null
          created_at: string
          entity_title: string
          entity_type: string
          id: string
          lesson_id: string | null
          note: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_name?: string | null
          course_id?: string | null
          created_at?: string
          entity_title: string
          entity_type: string
          id?: string
          lesson_id?: string | null
          note?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string | null
          course_id?: string | null
          created_at?: string
          entity_title?: string
          entity_type?: string
          id?: string
          lesson_id?: string | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_audit_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_audit_log_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          course_id: string | null
          created_at: string
          id: string
          lesson_id: string | null
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          headline: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
        }
        Relationships: []
      }
      security_findings: {
        Row: {
          code: string
          created_at: string
          detail: string | null
          id: string
          remediation: string | null
          resource: string
          run_id: string
          severity: string
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          detail?: string | null
          id?: string
          remediation?: string | null
          resource: string
          run_id: string
          severity?: string
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          detail?: string | null
          id?: string
          remediation?: string | null
          resource?: string
          run_id?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "security_scan_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_scan_runs: {
        Row: {
          created_at: string
          critical_count: number
          error: string | null
          findings_count: number
          finished_at: string | null
          id: string
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          created_at?: string
          critical_count?: number
          error?: string | null
          findings_count?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          trigger?: string
        }
        Update: {
          created_at?: string
          critical_count?: number
          error?: string | null
          findings_count?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      publish_due_lessons: { Args: never; Returns: undefined }
      run_security_checks: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "learner" | "teacher" | "admin"
      course_category:
        | "listening"
        | "reading"
        | "writing"
        | "speaking"
        | "vocabulary"
        | "grammar"
        | "mock_test"
      course_level: "beginner" | "intermediate" | "advanced"
      enrollment_status: "active" | "completed" | "cancelled"
      lesson_status: "draft" | "scheduled" | "published"
      moderation_status: "pending" | "approved" | "rejected"
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
      app_role: ["learner", "teacher", "admin"],
      course_category: [
        "listening",
        "reading",
        "writing",
        "speaking",
        "vocabulary",
        "grammar",
        "mock_test",
      ],
      course_level: ["beginner", "intermediate", "advanced"],
      enrollment_status: ["active", "completed", "cancelled"],
      lesson_status: ["draft", "scheduled", "published"],
      moderation_status: ["pending", "approved", "rejected"],
    },
  },
} as const
