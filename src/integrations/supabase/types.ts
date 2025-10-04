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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      chess_matches: {
        Row: {
          board_state: string
          created_at: string | null
          current_turn_player_id: string | null
          game_session_id: string | null
          id: string
          last_move_time: string | null
          match_status: string | null
          move_history: Json | null
          player1_time_remaining: number
          player2_time_remaining: number
          updated_at: string | null
        }
        Insert: {
          board_state?: string
          created_at?: string | null
          current_turn_player_id?: string | null
          game_session_id?: string | null
          id?: string
          last_move_time?: string | null
          match_status?: string | null
          move_history?: Json | null
          player1_time_remaining?: number
          player2_time_remaining?: number
          updated_at?: string | null
        }
        Update: {
          board_state?: string
          created_at?: string | null
          current_turn_player_id?: string | null
          game_session_id?: string | null
          id?: string
          last_move_time?: string | null
          match_status?: string | null
          move_history?: Json | null
          player1_time_remaining?: number
          player2_time_remaining?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chess_matches_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          receipt_image_url: string | null
          sender_number: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_details: Json
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_image_url?: string | null
          sender_number: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_image_url?: string | null
          sender_number?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          bet_amount: number
          completed_at: string | null
          created_at: string
          game_id: string
          id: string
          platform_earnings: number | null
          platform_fee_percentage: number | null
          player1_id: string | null
          player2_id: string | null
          prize_amount: number | null
          started_at: string | null
          status: string | null
          winner_earnings: number | null
          winner_id: string | null
        }
        Insert: {
          bet_amount: number
          completed_at?: string | null
          created_at?: string
          game_id: string
          id?: string
          platform_earnings?: number | null
          platform_fee_percentage?: number | null
          player1_id?: string | null
          player2_id?: string | null
          prize_amount?: number | null
          started_at?: string | null
          status?: string | null
          winner_earnings?: number | null
          winner_id?: string | null
        }
        Update: {
          bet_amount?: number
          completed_at?: string | null
          created_at?: string
          game_id?: string
          id?: string
          platform_earnings?: number | null
          platform_fee_percentage?: number | null
          player1_id?: string | null
          player2_id?: string | null
          prize_amount?: number | null
          started_at?: string | null
          status?: string | null
          winner_earnings?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      math_questions: {
        Row: {
          answer: number
          created_at: string | null
          difficulty_level: number | null
          id: string
          question: string
        }
        Insert: {
          answer: number
          created_at?: string | null
          difficulty_level?: number | null
          id?: string
          question: string
        }
        Update: {
          answer?: number
          created_at?: string | null
          difficulty_level?: number | null
          id?: string
          question?: string
        }
        Relationships: []
      }
      pending_moves: {
        Row: {
          cell_index: number
          expires_at: string | null
          game_session_id: string
          id: string
          player_id: string
          reserved_at: string | null
        }
        Insert: {
          cell_index: number
          expires_at?: string | null
          game_session_id: string
          id?: string
          player_id: string
          reserved_at?: string | null
        }
        Update: {
          cell_index?: number
          expires_at?: string | null
          game_session_id?: string
          id?: string
          player_id?: string
          reserved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_moves_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_earnings: {
        Row: {
          created_at: string | null
          earning_amount: number
          earning_date: string | null
          earning_percentage: number | null
          game_session_id: string | null
          id: string
          total_bet_amount: number
        }
        Insert: {
          created_at?: string | null
          earning_amount: number
          earning_date?: string | null
          earning_percentage?: number | null
          game_session_id?: string | null
          id?: string
          total_bet_amount: number
        }
        Update: {
          created_at?: string | null
          earning_amount?: number
          earning_date?: string | null
          earning_percentage?: number | null
          game_session_id?: string | null
          id?: string
          total_bet_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_earnings_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_activities: {
        Row: {
          activity_details: Json | null
          activity_type: string
          created_at: string | null
          earning_amount: number | null
          game_session_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          activity_details?: Json | null
          activity_type: string
          created_at?: string | null
          earning_amount?: number | null
          game_session_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          activity_details?: Json | null
          activity_type?: string
          created_at?: string | null
          earning_amount?: number | null
          game_session_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_match_activities_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_queue: {
        Row: {
          bet_amount: number
          created_at: string
          game_id: string
          id: string
          match_session_id: string | null
          matched_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bet_amount: number
          created_at?: string
          game_id: string
          id?: string
          match_session_id?: string | null
          matched_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bet_amount?: number
          created_at?: string
          game_id?: string
          id?: string
          match_session_id?: string | null
          matched_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number | null
          created_at: string
          email: string
          id: string
          losses: number | null
          role: string
          updated_at: string
          username: string | null
          wins: number | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          email: string
          id: string
          losses?: number | null
          role?: string
          updated_at?: string
          username?: string | null
          wins?: number | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          email?: string
          id?: string
          losses?: number | null
          role?: string
          updated_at?: string
          username?: string | null
          wins?: number | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
          withdrawal_details: Json
          withdrawal_method: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          withdrawal_details: Json
          withdrawal_method: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          withdrawal_details?: Json
          withdrawal_method?: string
        }
        Relationships: []
      }
      xo_matches: {
        Row: {
          board_state: Json | null
          created_at: string | null
          current_question_id: string | null
          current_turn_player_id: string | null
          game_session_id: string | null
          id: string
          match_status: string | null
          move_deadline: string | null
          question_start_time: string | null
          updated_at: string | null
        }
        Insert: {
          board_state?: Json | null
          created_at?: string | null
          current_question_id?: string | null
          current_turn_player_id?: string | null
          game_session_id?: string | null
          id?: string
          match_status?: string | null
          move_deadline?: string | null
          question_start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          board_state?: Json | null
          created_at?: string | null
          current_question_id?: string | null
          current_turn_player_id?: string | null
          game_session_id?: string | null
          id?: string
          match_status?: string | null
          move_deadline?: string | null
          question_start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xo_matches_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "math_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xo_matches_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_match_earnings: {
        Args: { session_id: string; winner_user_id: string }
        Returns: boolean
      }
      cancel_matchmaking: {
        Args: { p_bet_amount: number; p_game_id: string; p_user_id: string }
        Returns: Json
      }
      cancel_reservation: {
        Args: {
          p_cell_index: number
          p_game_session_id: string
          p_player_id: string
        }
        Returns: Json
      }
      cleanup_expired_reservations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_move: {
        Args: {
          p_cell_index: number
          p_game_session_id: string
          p_player_id: string
          p_symbol: string
        }
        Returns: Json
      }
      create_admin_auth_accounts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_new_xo_match: {
        Args: { session_id: string }
        Returns: undefined
      }
      find_match_and_create_session: {
        Args: { p_bet_amount: number; p_game_id: string; p_user_id: string }
        Returns: Json
      }
      find_match_and_create_session_v3: {
        Args: { p_bet_amount: number; p_game_id: string; p_user_id: string }
        Returns: Json
      }
      generate_random_math_question: {
        Args: Record<PropertyKey, never>
        Returns: {
          answer: number
          difficulty_level: number
          id: string
          question: string
        }[]
      }
      get_math_question_by_id: {
        Args: { question_id: string }
        Returns: {
          difficulty_level: number
          id: string
          question: string
        }[]
      }
      get_public_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          losses: number
          username: string
          wins: number
        }[]
      }
      get_public_username: {
        Args: { user_id_input: string }
        Returns: {
          username: string
        }[]
      }
      get_queue_stats: {
        Args: { p_game_id?: string }
        Returns: Json
      }
      get_random_math_question: {
        Args: Record<PropertyKey, never>
        Returns: {
          difficulty_level: number
          id: string
          question: string
        }[]
      }
      get_user_email_by_username: {
        Args: { username_input: string }
        Returns: {
          email: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      handle_draw_match: {
        Args: { session_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_deposit_access: {
        Args: { request_id: string }
        Returns: undefined
      }
      log_user_activity: {
        Args: { _action: string; _details?: Json; _user_id: string }
        Returns: undefined
      }
      make_chess_move: {
        Args: {
          p_board_state: string
          p_from: string
          p_game_session_id: string
          p_move_data: Json
          p_player_id: string
          p_to: string
        }
        Returns: Json
      }
      reserve_cell: {
        Args: {
          p_cell_index: number
          p_game_session_id: string
          p_player_id: string
        }
        Returns: Json
      }
      search_user_by_username: {
        Args: { username_input: string }
        Returns: {
          id: string
          losses: number
          username: string
          wins: number
        }[]
      }
      update_chess_timer: {
        Args: {
          p_game_session_id: string
          p_player1_time: number
          p_player2_time: number
        }
        Returns: Json
      }
      update_user_balance: {
        Args: { _amount: number; _operation: string; _user_id: string }
        Returns: boolean
      }
      update_xo_board: {
        Args: {
          p_game_session_id: string
          p_new_board: string
          p_player_id: string
        }
        Returns: Json
      }
      validate_generated_math_answer: {
        Args: { question_text: string; user_answer: number }
        Returns: {
          correct_answer: number
          is_correct: boolean
        }[]
      }
      validate_math_answer: {
        Args: { question_id: string; user_answer: number }
        Returns: {
          correct_answer: number
          is_correct: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
