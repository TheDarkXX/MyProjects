export interface ScoreBreakdown {
  financial: number;
  moat: number;
  ownership: number;
  actionability: number;
  source: number;
  total: number;
  penalties?: string[];
  notes?: string;
  evidence_quotes?: {
    financial?: string;
    moat?: string;
  };
}

export interface NewsItem {
  id: number;
  ticker: string;
  company_name: string;
  headline: string;
  headline_th?: string | null;
  source_name: string;
  source_url: string;
  summary_th: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  reading_priority: 'THE_MUST' | 'CATALYST' | 'WATCHLIST' | 'CHATTER' | 'GOOD_TO_KNOW' | 'OPTIONAL';
  priority_reason: string;
  impact_level: 'routine' | 'significant' | 'moat_breaker';
  portfolio_tag: 'main' | 'tiger' | 'dual' | 'global';
  related_portfolio_id: string | null;
  relevance_score?: number;
  triage_tags?: string | string[];
  score_breakdown?: string | ScoreBreakdown | null;
  full_content?: string | null;
  content_source?: string | null;
  content_source_url?: string | null;
  content_fetched_at?: string | null;
  content_relevance_score?: number | null;
  source_count?: number;
  event_fingerprint?: string | null;
  is_read: number;
  created_at: string;
}

export type ViewMode = 'list' | 'mini_card' | 'big_card' | 'full' | 'text';

export type SortKey = 'date' | 'ticker' | 'priority' | 'score' | 'sentiment';

export type SortOrder = 'desc' | 'asc';

export interface NewsStats {
  theMustUnread: number;
  catalystUnread: number;
  watchlistUnread: number;
  chatterUnread: number;
  goodToKnowUnread?: number;
  mainUnread: number;
  tigerUnread: number;
  totalUnread: number;
  totalArticles: number;
}

export interface TimingStats {
  totalArticles: number;
  byDay: { day: string; count: number }[];
  byHour: { hour: number; count: number }[];
}

export interface TriageStats {
  byAction: { action: string; count: number; avgScore: number }[];
  recentTriage: any[];
}
