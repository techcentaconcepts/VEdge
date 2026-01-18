export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          subscription_tier: 'free' | 'starter' | 'pro'
          telegram_chat_id: number | null
          telegram_username: string | null
          stripe_customer_id: string | null
          paystack_customer_code: string | null
          alert_preferences: {
            min_edge: number
            sports: string[]
            enabled: boolean
          }
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          subscription_tier?: 'free' | 'starter' | 'pro'
          telegram_chat_id?: number | null
          telegram_username?: string | null
          stripe_customer_id?: string | null
          paystack_customer_code?: string | null
          alert_preferences?: {
            min_edge: number
            sports: string[]
            enabled: boolean
          }
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          subscription_tier?: 'free' | 'starter' | 'pro'
          telegram_chat_id?: number | null
          telegram_username?: string | null
          stripe_customer_id?: string | null
          paystack_customer_code?: string | null
          alert_preferences?: {
            min_edge: number
            sports: string[]
            enabled: boolean
          }
          created_at?: string
          updated_at?: string
        }
      }
      bankrolls: {
        Row: {
          id: string
          user_id: string
          bookmaker: string
          currency: string
          balance: number
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bookmaker: string
          currency?: string
          balance?: number
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bookmaker?: string
          currency?: string
          balance?: number
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bets: {
        Row: {
          id: string
          user_id: string
          external_bet_id: string | null
          bookmaker: string
          sport: string
          league: string | null
          match_name: string
          market: string
          selection: string
          odds: number
          stake: number
          currency: string
          potential_return: number
          outcome: 'pending' | 'won' | 'lost' | 'void' | 'cashout' | null
          profit_loss: number | null
          closing_odds: number | null
          clv_percent: number | null
          placed_at: string
          settled_at: string | null
          synced_from: 'extension' | 'manual' | 'api' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          external_bet_id?: string | null
          bookmaker: string
          sport: string
          league?: string | null
          match_name: string
          market: string
          selection: string
          odds: number
          stake: number
          currency?: string
          outcome?: 'pending' | 'won' | 'lost' | 'void' | 'cashout' | null
          profit_loss?: number | null
          closing_odds?: number | null
          placed_at: string
          settled_at?: string | null
          synced_from?: 'extension' | 'manual' | 'api' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          external_bet_id?: string | null
          bookmaker?: string
          sport?: string
          league?: string | null
          match_name?: string
          market?: string
          selection?: string
          odds?: number
          stake?: number
          currency?: string
          outcome?: 'pending' | 'won' | 'lost' | 'void' | 'cashout' | null
          profit_loss?: number | null
          closing_odds?: number | null
          placed_at?: string
          settled_at?: string | null
          synced_from?: 'extension' | 'manual' | 'api' | null
          created_at?: string
        }
      }
      value_opportunities: {
        Row: {
          id: string
          match_id: string
          match_name: string
          sport: string
          league: string | null
          kickoff_time: string
          market: string
          selection: string
          sharp_bookmaker: string
          sharp_odds: number
          soft_bookmaker: string
          soft_odds: number
          edge_percent: number
          kelly_fraction: number | null
          status: 'active' | 'expired' | 'odds_moved' | 'won' | 'lost'
          detected_at: string
          expired_at: string | null
          bet_link: string | null
        }
        Insert: {
          id?: string
          match_id: string
          match_name: string
          sport: string
          league?: string | null
          kickoff_time: string
          market: string
          selection: string
          sharp_bookmaker: string
          sharp_odds: number
          soft_bookmaker: string
          soft_odds: number
          edge_percent: number
          kelly_fraction?: number | null
          status?: 'active' | 'expired' | 'odds_moved' | 'won' | 'lost'
          detected_at?: string
          expired_at?: string | null
          bet_link?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          match_name?: string
          sport?: string
          league?: string | null
          kickoff_time?: string
          market?: string
          selection?: string
          sharp_bookmaker?: string
          sharp_odds?: number
          soft_bookmaker?: string
          soft_odds?: number
          edge_percent?: number
          kelly_fraction?: number | null
          status?: 'active' | 'expired' | 'odds_moved' | 'won' | 'lost'
          detected_at?: string
          expired_at?: string | null
          bet_link?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: 'free' | 'starter' | 'pro'
          payment_provider: 'stripe' | 'paystack' | null
          external_subscription_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          status: 'active' | 'past_due' | 'canceled' | 'trialing'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: 'free' | 'starter' | 'pro'
          payment_provider?: 'stripe' | 'paystack' | null
          external_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          status?: 'active' | 'past_due' | 'canceled' | 'trialing'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: 'free' | 'starter' | 'pro'
          payment_provider?: 'stripe' | 'paystack' | null
          external_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          status?: 'active' | 'past_due' | 'canceled' | 'trialing'
          created_at?: string
          updated_at?: string
        }
      }
      alert_log: {
        Row: {
          id: string
          user_id: string
          opportunity_id: string | null
          channel: 'telegram' | 'email' | 'push'
          status: 'sent' | 'delivered' | 'failed' | 'clicked'
          sent_at: string
          delivered_at: string | null
          clicked_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          opportunity_id?: string | null
          channel: 'telegram' | 'email' | 'push'
          status: 'sent' | 'delivered' | 'failed' | 'clicked'
          sent_at?: string
          delivered_at?: string | null
          clicked_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          opportunity_id?: string | null
          channel?: 'telegram' | 'email' | 'push'
          status?: 'sent' | 'delivered' | 'failed' | 'clicked'
          sent_at?: string
          delivered_at?: string | null
          clicked_at?: string | null
        }
      }
    }
    Functions: {
      calculate_user_stats: {
        Args: { p_user_id: string }
        Returns: {
          total_bets: number
          total_staked: number
          total_profit: number
          roi: number
          win_rate: number
          avg_clv: number
          pending_bets: number
          last_updated: string
        }
      }
      get_active_opportunities: {
        Args: { p_min_edge?: number; p_limit?: number }
        Returns: Database['public']['Tables']['value_opportunities']['Row'][]
      }
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Bankroll = Database['public']['Tables']['bankrolls']['Row']
export type Bet = Database['public']['Tables']['bets']['Row']
export type ValueOpportunity = Database['public']['Tables']['value_opportunities']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type AlertLog = Database['public']['Tables']['alert_log']['Row']

export type SubscriptionTier = 'free' | 'starter' | 'pro'
export type BetOutcome = 'pending' | 'won' | 'lost' | 'void' | 'cashout'
export type OpportunityStatus = 'active' | 'expired' | 'odds_moved' | 'won' | 'lost'

// Stats type
export type UserStats = {
  total_bets: number
  total_staked: number
  total_profit: number
  roi: number
  win_rate: number
  avg_clv: number
  pending_bets: number
  last_updated: string
}
