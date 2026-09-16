import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Flame, Sparkles, Filter, CheckCheck, RefreshCw, ExternalLink, 
  Clock, ShieldAlert, BookOpen, Layers, Search, Check, ChevronDown, 
  ChevronUp, BarChart2, Eye, EyeOff, Target, Star, Trash2, Plus, Zap,
  Hash, X
} from 'lucide-react';
import clsx from 'clsx';
import { NewsTickerDock } from './NewsTickerDock';

interface NewsItem {
  id: number;
  ticker: string;
  company_name: string;
  headline: string;
  source_name: string;
  source_url: string;
  summary_th: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  reading_priority: 'THE_MUST' | 'GOOD_TO_KNOW' | 'OPTIONAL';
  priority_reason: string;
  impact_level: 'routine' | 'significant' | 'moat_breaker';
  portfolio_tag: 'main' | 'tiger' | 'dual' | 'global';
  related_portfolio_id: string | null;
  relevance_score?: number;
  triage_tags?: string | string[];
  is_read: number;
  created_at: string;
}

interface NewsStats {
  theMustUnread: number;
  goodToKnowUnread: number;
  mainUnread: number;
  tigerUnread: number;
  totalUnread: number;
  totalArticles: number;
}

interface TimingStats {
  totalArticles: number;
  byDay: { day: string; count: number }[];
  byHour: { hour: number; count: number }[];
}

interface TriageStats {
  byAction: { action: string; count: number; avgScore: number }[];
  recentTriage: any[];
}

export const NewsIntelPage: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [timingStats, setTimingStats] = useState<TimingStats | null>(null);
  const [triageStats, setTriageStats] = useState<TriageStats | null>(null);
  const [triageLog, setTriageLog] = useState<any[]>([]);
  const [triageActionFilter, setTriageActionFilter] = useState<string>('all');
  const [watchlistData, setWatchlistData] = useState<{ allWatchlist: string[]; customList: any[] }>({ allWatchlist: [], customList: [] });
  const [newWatchlistTicker, setNewWatchlistTicker] = useState('');
  const [newWatchlistNote, setNewWatchlistNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);

  // Filters
  const [selectedPortfolio, setSelectedPortfolio] = useState<'all' | 'main' | 'tiger' | 'global'>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'the_must' | 'focus' | 'good_to_know' | 'optional'>('focus');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tickerStats, setTickerStats] = useState<Record<string, any>>({});
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showMobileDock, setShowMobileDock] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPortfolio !== 'all') params.append('portfolio', selectedPortfolio);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      if (unreadOnly) params.append('unread_only', 'true');
      if (searchQuery.trim()) params.append('ticker', searchQuery.trim().toUpperCase());
      if (selectedTicker) params.append('ticker', selectedTicker);
      if (selectedTag) params.append('tag', selectedTag);

      const res = await fetch(`/api/news?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
      }
    } catch (err) {
      console.error('[NewsIntel] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolio, selectedPriority, unreadOnly, searchQuery, selectedTicker, selectedTag]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/news/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch (err) {
      console.error('[NewsIntel] Stats fetch error:', err);
    }
  };

  const fetchTickerStats = async () => {
    try {
      const res = await fetch('/api/news/ticker-stats');
      if (res.ok) {
        const json = await res.json();
        setTickerStats(json.data || {});
      }
    } catch (err) {
      console.error('[NewsIntel] Ticker stats fetch error:', err);
    }
  };

  const fetchTiming = async () => {
    try {
      const res = await fetch('/api/news/timing-stats');
      if (res.ok) {
        const json = await res.json();
        setTimingStats(json);
      }
    } catch (err) {
      console.error('[NewsIntel] Timing fetch error:', err);
    }
  };

  const fetchTriageData = async () => {
    try {
      const [sRes, lRes] = await Promise.all([
        fetch('/api/news/triage-stats'),
        fetch('/api/news/triage-log?limit=50')
      ]);
      if (sRes.ok) setTriageStats(await sRes.json());
      if (lRes.ok) {
        const lJson = await lRes.json();
        setTriageLog(lJson.data || []);
      }
    } catch (err) {
      console.error('[NewsIntel] Triage fetch error:', err);
    }
  };

  const fetchWatchlistData = async () => {
    try {
      const res = await fetch('/api/news/watchlist');
      if (res.ok) {
        const json = await res.json();
        setWatchlistData(json);
      }
    } catch (err) {
      console.error('[NewsIntel] Watchlist fetch error:', err);
    }
  };

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistTicker.trim()) return;
    try {
      await fetch('/api/news/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newWatchlistTicker.trim(), note: newWatchlistNote.trim() })
      });
      setNewWatchlistTicker('');
      setNewWatchlistNote('');
      fetchWatchlistData();
    } catch (err) {
      console.error('Failed to add ticker to watchlist:', err);
    }
  };

  const handleDeleteWatchlist = async (symbol: string) => {
    try {
      await fetch(`/api/news/watchlist/${symbol}`, { method: 'DELETE' });
      fetchWatchlistData();
    } catch (err) {
      console.error('Failed to delete ticker:', err);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchStats();
    fetchTickerStats();
  }, [fetchNews]);

  const handleMarkAsRead = async (id: number, currentRead: number) => {
    try {
      // Optimistic update
      setItems(prev => prev.map(item => item.id === id ? { ...item, is_read: currentRead ? 0 : 1 } : item));
      await fetch(`/api/news/${id}/read`, { method: 'POST' });
      fetchStats();
      fetchTickerStats();
    } catch (err) {
      console.error('Failed to toggle read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const p = selectedPortfolio !== 'all' ? `?portfolio=${selectedPortfolio}` : '';
      await fetch(`/api/news/mark-all-read${p}`, { method: 'POST' });
      setItems(prev => prev.map(item => ({ ...item, is_read: 1 })));
      fetchStats();
      fetchTickerStats();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleScanNow = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/news/scan', { method: 'POST' });
      if (res.ok) {
        await Promise.all([fetchNews(), fetchStats(), fetchTiming(), fetchTickerStats()]);
      }
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-[1680px] mx-auto pb-12 items-start">
      {/* Left Column: Main News Feed */}
      <div className="flex-1 min-w-0 space-y-6 w-full">
        {/* 1. Header & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111418] border border-[#2A2E45] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#823AFD] to-[#FC2D79] flex items-center justify-center text-white shadow-[0_0_16px_rgba(130,58,253,0.4)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 font-heading">
                News Intelligence Feed
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#823AFD]/20 text-[#A78BFA] border border-[#823AFD]/30 font-medium">
                  Dual-Port • GPT-5.6 Terra
                </span>
              </h1>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                หูตาอัจฉริยะแบบไร้เสียงรบกวน — กรองข่าวสำคัญ จัดเกรด Priority และสรุปเนื้อหาภาษาไทยให้ทันที
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowMobileDock(true)}
            className="xl:hidden px-3.5 py-2 rounded-xl bg-[#823AFD]/20 hover:bg-[#823AFD]/30 text-[#C4B5FD] border border-[#823AFD]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="เปิดเมนูกรองหุ้น 3 พอร์ต"
          >
            <Hash className="w-4 h-4 text-[#FC2D79]" />
            หุ้น & พอร์ต (3 Tabs)
          </button>

          <button
            onClick={() => { fetchTriageData(); setShowTriageModal(true); }}
            className="px-3.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-[#252A40] text-[#94A3B8] hover:text-white border border-[#2A2E45] text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="ดูกระบวนการคัดกรอง 6 ประตู (Triage Radar Funnel)"
          >
            <Target className="w-4 h-4 text-rose-400" />
            Triage Radar
          </button>

          <button
            onClick={() => { fetchWatchlistData(); setShowWatchlistModal(true); }}
            className="px-3.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-[#252A40] text-[#94A3B8] hover:text-white border border-[#2A2E45] text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="จัดการหุ้นใน Watchlist"
          >
            <Star className="w-4 h-4 text-amber-400" />
            Watchlist
          </button>

          <button
            onClick={() => { fetchTiming(); setShowTimingModal(true); }}
            className="px-3.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-[#252A40] text-[#94A3B8] hover:text-white border border-[#2A2E45] text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="ดูสถิติเวลาที่ต้นทางมักปล่อยบทความ"
          >
            <BarChart2 className="w-4 h-4 text-[#823AFD]" />
            Timing Profiler
          </button>

          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-[#252A40] text-[#94A3B8] hover:text-white border border-[#2A2E45] text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            Mark all read
          </button>

          <button
            onClick={handleScanNow}
            disabled={scanning}
            className={clsx(
              "px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md",
              scanning 
                ? "bg-slate-700 text-slate-300 cursor-not-allowed" 
                : "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] hover:opacity-95 text-white shadow-[0_4px_16px_rgba(130,58,253,0.3)]"
            )}
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", scanning && "animate-spin")} />
            {scanning ? 'Scanning...' : 'Check Radar Now'}
          </button>
        </div>
      </div>

      {/* 2. Stat Badges Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => { setSelectedPriority('the_must'); setUnreadOnly(false); }}
          className={clsx(
            "p-4 rounded-xl border transition-all cursor-pointer select-none",
            selectedPriority === 'the_must'
              ? "bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
              : "bg-[#111418] border-[#2A2E45] hover:border-rose-500/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-4 h-4" /> The Must
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
              {stats?.theMustUnread || 0} Unread
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-white">
            {stats?.theMustUnread ? `🔥 ${stats.theMustUnread} ข่าวต้องอ่าน` : 'สะอาด เคลียร์หมด'}
          </div>
        </div>

        <div 
          onClick={() => { setSelectedPriority('good_to_know'); setUnreadOnly(false); }}
          className={clsx(
            "p-4 rounded-xl border transition-all cursor-pointer select-none",
            selectedPriority === 'good_to_know'
              ? "bg-amber-950/40 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              : "bg-[#111418] border-[#2A2E45] hover:border-amber-500/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> Good to Know
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              {stats?.goodToKnowUnread || 0}
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-white">
            {stats?.goodToKnowUnread || 0} ข่าวอัปเดต
          </div>
        </div>

        <div 
          onClick={() => { setSelectedPortfolio('main'); }}
          className={clsx(
            "p-4 rounded-xl border transition-all cursor-pointer select-none",
            selectedPortfolio === 'main'
              ? "bg-indigo-950/40 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
              : "bg-[#111418] border-[#2A2E45] hover:border-indigo-500/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              🏢 พอร์ตหลัก
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              Doctorbank
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-white">
            {stats?.mainUnread || 0} Unread
          </div>
        </div>

        <div 
          onClick={() => { setSelectedPortfolio('tiger'); }}
          className={clsx(
            "p-4 rounded-xl border transition-all cursor-pointer select-none",
            selectedPortfolio === 'tiger'
              ? "bg-orange-950/40 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
              : "bg-[#111418] border-[#2A2E45] hover:border-orange-500/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
              🐯 พอร์ตลูก
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
              Tiger 2X
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-white">
            {stats?.tigerUnread || 0} Unread
          </div>
        </div>
      </div>

      {/* 3. Filter Controls Bar */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Portfolio Switcher & Priority Tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Portfolio Segmented */}
          <div className="bg-[#0F111A] p-1 rounded-xl border border-[#1F2233] flex items-center">
            <button
              onClick={() => setSelectedPortfolio('all')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                selectedPortfolio === 'all' ? "bg-[#1F2233] text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedPortfolio('main')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                selectedPortfolio === 'main' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              🏢 พอร์ตหลัก
            </button>
            <button
              onClick={() => setSelectedPortfolio('tiger')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                selectedPortfolio === 'tiger' ? "bg-orange-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              🐯 พอร์ตลูก
            </button>
            <button
              onClick={() => setSelectedPortfolio('global')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                selectedPortfolio === 'global' ? "bg-[#1F2233] text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              🌐 Watchlist
            </button>
          </div>

          <div className="h-6 w-px bg-[#2A2E45] hidden sm:block" />

          {/* Priority Filter */}
          <div className="bg-[#0F111A] p-1 rounded-xl border border-[#1F2233] flex items-center">
            <button
              onClick={() => setSelectedPriority('the_must')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                selectedPriority === 'the_must' ? "bg-rose-600 text-white shadow-sm" : "text-rose-400 hover:text-rose-300"
              )}
            >
              <Flame className="w-3.5 h-3.5" /> The Must
            </button>
            <button
              onClick={() => setSelectedPriority('focus')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                selectedPriority === 'focus' ? "bg-[#823AFD] text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
              title="เฉพาะ The Must และ Good to Know (ซ่อน Noise)"
            >
              Focus Mode
            </button>
            <button
              onClick={() => setSelectedPriority('all')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                selectedPriority === 'all' ? "bg-[#1F2233] text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              All News
            </button>
          </div>
        </div>

        {/* Right: Unread Toggle & Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={clsx(
              "px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              unreadOnly 
                ? "bg-[#823AFD]/20 border-[#823AFD] text-[#A78BFA]" 
                : "bg-[#0F111A] border-[#1F2233] text-slate-400 hover:text-white"
            )}
          >
            {unreadOnly ? <EyeOff className="w-3.5 h-3.5 text-[#823AFD]" /> : <Eye className="w-3.5 h-3.5" />}
            เฉพาะยังไม่อ่าน
          </button>

          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา Ticker (เช่น RBRK)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F111A] border border-[#1F2233] focus:border-[#823AFD] text-xs text-white pl-9 pr-3 py-1.5 rounded-xl outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Active Hashtag / Ticker Filter Banner */}
      {(selectedTicker || selectedTag) && (
        <div className="bg-[#16121D] border border-[#823AFD]/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-[0_4px_24px_rgba(130,58,253,0.2)] animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#823AFD]/20 text-[#C4B5FD] flex items-center justify-center font-bold text-sm shrink-0 border border-[#823AFD]/40">
              #
            </span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2 font-heading">
                กำลังกรองเฉพาะ:
                <span className="px-2.5 py-0.5 rounded-lg bg-[#823AFD] text-white font-mono font-black text-xs shadow-[0_0_12px_rgba(130,58,253,0.5)]">
                  {selectedTicker ? `#${selectedTicker}` : `#${selectedTag}`}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (พบ {items.length} ข่าว)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                แสดงเฉพาะบทความที่มีสัญญาณเกี่ยวกับตัวนี้ • คลิกปุ่มขวามือเพื่อดูข่าวทั้งหมด
              </p>
            </div>
          </div>
          <button
            onClick={() => { setSelectedTicker(null); setSelectedTag(null); }}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 border border-white/10"
          >
            <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* 4. News Feed Card Stream */}
      {loading ? (
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-3 border-[#823AFD] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 mt-4 font-semibold">กำลังดึงข้อมูลข่าวสารอัจฉริยะ...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-xl">
            ☕
          </div>
          <h3 className="text-base font-bold text-white font-heading">ไม่มีข่าวที่ตรงกับเงื่อนไขในขณะนี้</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            เคลียร์หมดจด สบายใจได้! ไม่มีข่าวระดับ The Must ที่ยังค้างอยู่ หรือกดปุ่ม "Check Radar Now" เพื่อตรวจจับหัวข้อใหม่สดๆ จาก Beehiiv
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isMust = item.reading_priority === 'THE_MUST';
            const isGood = item.reading_priority === 'GOOD_TO_KNOW';
            const isRead = item.is_read === 1;

            return (
              <div
                key={item.id}
                className={clsx(
                  "rounded-2xl border transition-all relative overflow-hidden",
                  isMust
                    ? isRead
                      ? "bg-[#111418] border-rose-500/30 opacity-80 hover:opacity-100"
                      : "bg-[#16121D] border-rose-500 shadow-[0_4px_24px_rgba(244,63,94,0.18)]"
                    : isGood
                      ? isRead
                        ? "bg-[#111418] border-[#2A2E45] opacity-80 hover:opacity-100"
                        : "bg-[#111418] border-amber-500/30 hover:border-amber-500/60"
                      : "bg-[#0D1017] border-[#1F2233] opacity-75 hover:opacity-100"
                )}
              >
                {/* Top Accent Stripe for The Must */}
                {isMust && !isRead && (
                  <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-orange-500 to-[#FC2D79]" />
                )}

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Card Header: Badges & Ticker */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority Badge */}
                      {isMust ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                          <Flame className="w-3.5 h-3.5 text-rose-400" /> THE MUST
                        </span>
                      ) : isGood ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> GOOD TO KNOW
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          ☕ OPTIONAL
                        </span>
                      )}

                      {/* Portfolio Tag Badge */}
                      {item.portfolio_tag === 'main' && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          🏢 พอร์ตหลัก
                        </span>
                      )}
                      {item.portfolio_tag === 'tiger' && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          🐯 พอร์ตลูก
                        </span>
                      )}
                      {item.portfolio_tag === 'dual' && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          ⚡ มีใน 2 พอร์ต
                        </span>
                      )}
                      {item.portfolio_tag === 'global' && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
                          🌐 Watchlist
                        </span>
                      )}

                      {/* Ticker Pill / Interactive Hashtag */}
                      <button
                        onClick={() => {
                          if (selectedTicker === item.ticker) {
                            setSelectedTicker(null);
                          } else {
                            setSelectedTicker(item.ticker);
                            setSelectedTag(null);
                          }
                        }}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer flex items-center gap-1",
                          selectedTicker === item.ticker
                            ? "bg-[#823AFD] text-white border-white/30 shadow-[0_0_12px_rgba(130,58,253,0.5)] ring-1 ring-white"
                            : "bg-white/10 hover:bg-[#823AFD]/25 hover:border-[#823AFD] text-white border-white/15"
                        )}
                        title={`คลิกเพื่อกรองข่าวเฉพาะหุ้น #${item.ticker}`}
                      >
                        #{item.ticker}
                      </button>

                      {/* Sentiment */}
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        item.sentiment === 'bullish' && "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
                        item.sentiment === 'bearish' && "text-rose-400 bg-rose-500/10 border border-rose-500/20",
                        item.sentiment === 'neutral' && "text-slate-400 bg-slate-800 border border-slate-700"
                      )}>
                        {item.sentiment === 'bullish' ? '🟢 เชิงบวก' : item.sentiment === 'bearish' ? '🔴 เชิงลบ' : '⚪ เป็นกลาง'}
                      </span>

                      {/* Triage Relevance Score */}
                      {item.relevance_score !== undefined && item.relevance_score > 0 && (
                        <span className={clsx(
                          "px-2 py-0.5 rounded-lg text-[11px] font-mono font-black flex items-center gap-1 border",
                          item.relevance_score >= 80 
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                            : item.relevance_score >= 60 
                              ? "bg-[#823AFD]/20 text-[#C4B5FD] border-[#823AFD]/40" 
                              : "bg-slate-800 text-slate-400 border-slate-700"
                        )}>
                          <Zap className="w-3 h-3" /> {item.relevance_score} pts
                        </span>
                      )}

                      {/* Triage Tags (Interactive Hashtags) */}
                      {(() => {
                        let tags: string[] = [];
                        if (Array.isArray(item.triage_tags)) tags = item.triage_tags;
                        else if (typeof item.triage_tags === 'string') {
                          try { tags = JSON.parse(item.triage_tags); } catch {}
                        }
                        return tags.map((t, idx) => {
                          const isVip = t.startsWith('VIP');
                          const isEco = t.startsWith('ECO');
                          const isMacro = t === 'MACRO' || t === 'MARKET_SUMMARY';
                          const isCatalyst = t === 'CATALYST';
                          const isTagActive = selectedTag === t;
                          return (
                            <button 
                              key={idx}
                              onClick={() => {
                                if (selectedTag === t) {
                                  setSelectedTag(null);
                                } else {
                                  setSelectedTag(t);
                                  setSelectedTicker(null);
                                }
                              }}
                              className={clsx(
                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-0.5",
                                isTagActive
                                  ? "bg-[#823AFD] text-white border-white/30 shadow-[0_0_10px_rgba(130,58,253,0.4)]"
                                  : clsx(
                                      isVip && "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25",
                                      isEco && "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25",
                                      isMacro && "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25",
                                      isCatalyst && "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25",
                                      !isVip && !isEco && !isMacro && !isCatalyst && "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                    )
                              )}
                              title={`คลิกเพื่อกรองข่าวตามแท็ก #${t}`}
                            >
                              <span>#{t}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Timestamp & Read Toggle */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(item.created_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleMarkAsRead(item.id, item.is_read)}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all",
                          isRead
                            ? "bg-slate-800/50 text-slate-500 border-slate-700 hover:text-slate-300"
                            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                        )}
                        title={isRead ? "คลิกเพื่อเปลี่ยนเป็นยังไม่อ่าน" : "คลิกเพื่อทำเครื่องหมายว่าอ่านแล้ว"}
                      >
                        {isRead ? <EyeOff className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                        {isRead ? 'อ่านแล้ว' : 'Mark read'}
                      </button>
                    </div>
                  </div>

                  {/* Headline Title */}
                  <h2 className="text-lg font-bold text-white leading-snug tracking-tight">
                    {item.headline}
                  </h2>

                  {/* Priority Reason Banner (if present) */}
                  {item.priority_reason && (
                    <div className={clsx(
                      "text-xs px-3.5 py-2 rounded-xl flex items-start gap-2 border",
                      isMust
                        ? "bg-rose-950/30 border-rose-500/30 text-rose-200"
                        : "bg-[#1A1D2D] border-[#2A2E45] text-slate-300"
                    )}>
                      <span className="font-bold shrink-0">💡 เหตุผลที่คัดเกรด:</span>
                      <span>{item.priority_reason}</span>
                    </div>
                  )}

                  {/* AI Summary Box (3 bullets Thai) */}
                  <div className="bg-[#0A0C12] border border-[#1F2233] rounded-xl p-4 space-y-2">
                    <div className="text-[11px] font-bold text-[#823AFD] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Synthesized Summary (GPT-5.6 Terra)
                    </div>
                    <div className="text-xs text-slate-200 leading-relaxed font-body whitespace-pre-line">
                      {item.summary_th}
                    </div>
                  </div>

                  {/* Card Footer: Source Link */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs text-slate-500">
                    <span>แหล่งอ้างอิง: <span className="text-slate-400 font-medium">{item.source_name}</span></span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#823AFD] hover:text-[#A78BFA] font-bold flex items-center gap-1 transition-colors"
                      >
                        เปิดอ่านต้นฉบับ <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Right Column: Sticky News Ticker Dock (Desktop) */}
      <div className={clsx(
        "hidden xl:block sticky top-6 shrink-0 transition-all duration-300 rounded-2xl overflow-hidden border border-[#1F2233]",
        dockCollapsed ? "w-12" : "w-80"
      )}>
        <NewsTickerDock
          selectedTicker={selectedTicker}
          selectedTag={selectedTag}
          tickerStats={tickerStats}
          customWatchlist={watchlistData.allWatchlist}
          onSelectTicker={(ticker) => {
            setSelectedTicker(ticker);
            setSelectedTag(null);
          }}
          onSelectTag={(tag) => {
            setSelectedTag(tag);
            setSelectedTicker(null);
          }}
          onClearFilter={() => {
            setSelectedTicker(null);
            setSelectedTag(null);
          }}
          onManageWatchlist={() => setShowWatchlistModal(true)}
          collapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed(!dockCollapsed)}
        />
      </div>

      {/* Mobile News Ticker Dock Drawer */}
      {showMobileDock && (
        <div className="fixed inset-0 z-50 xl:hidden bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm h-full bg-[#0D1019] p-4 flex flex-col shadow-2xl animate-fade-in border-l border-[#1F2233]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2233] mb-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#823AFD]" /> Ticker Navigator
              </span>
              <button
                onClick={() => setShowMobileDock(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NewsTickerDock
                selectedTicker={selectedTicker}
                selectedTag={selectedTag}
                tickerStats={tickerStats}
                customWatchlist={watchlistData.allWatchlist}
                onSelectTicker={(ticker) => {
                  setSelectedTicker(ticker);
                  setSelectedTag(null);
                  setShowMobileDock(false);
                }}
                onSelectTag={(tag) => {
                  setSelectedTag(tag);
                  setSelectedTicker(null);
                  setShowMobileDock(false);
                }}
                onClearFilter={() => {
                  setSelectedTicker(null);
                  setSelectedTag(null);
                  setShowMobileDock(false);
                }}
                onManageWatchlist={() => {
                  setShowMobileDock(false);
                  setShowWatchlistModal(true);
                }}
                collapsed={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Publication Timing Profiler Modal */}
      {showTimingModal && timingStats && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A2E45] pb-4">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-5 h-5 text-[#823AFD]" />
                <h3 className="text-lg font-bold text-white font-heading">Beehiiv Publication Timing Profiler</h3>
              </div>
              <button
                onClick={() => setShowTimingModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              วิเคราะห์สถิติเวลาจากบทความทั้งหมด {timingStats.totalArticles} ชิ้น เพื่อปรับจูนรอบ Cron ให้ตรงเป๊ะ
            </p>

            {/* By Day of Week */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                📅 ความถี่แยกตามวันในสัปดาห์ (Day of Week):
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timingStats.byDay.map(d => (
                  <div key={d.day} className="bg-[#0F111A] border border-[#1F2233] p-3 rounded-xl text-center">
                    <div className="text-xs font-bold text-[#A78BFA]">{d.day}</div>
                    <div className="text-base font-black text-white mt-1">{d.count} ครั้ง</div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Hour of Day */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                ⏰ ช่วงเวลายอดนิยมที่ลงบทความ (เวลาไทย ICT):
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {timingStats.byHour.map(h => {
                  const ictHour = (h.hour + 7) % 24;
                  return (
                    <div key={h.hour} className="bg-[#0F111A] border border-[#1F2233] px-3.5 py-2 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300">{String(ictHour).padStart(2, '0')}:00 น. (ICT)</span>
                      <span className="font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-full">{h.count} บทความ</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#1A1D2D] border border-[#2A2E45] p-3.5 rounded-xl text-xs text-slate-300 flex items-start gap-2">
              <span className="text-[#823AFD] font-bold">💡 ข้อสรุป:</span>
              <span>
                บทความส่วนใหญ่ปล่อยวัน <strong>อังคารและจันทร์</strong> ในช่วง <strong>14:00 - 16:00 น.</strong> รอบ Cron เช้า-เย็น (08:30 น. และ 20:30 น.) จึงครอบคลุมได้สมบูรณ์แบบโดยไม่ต้องยิงถี่
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. 6-Gate Triage Radar Funnel Modal */}
      {showTriageModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2A2E45] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">6-Gate Pre-Filter Triage Radar</h3>
                  <p className="text-xs text-slate-400">ระบบกรองสัญญาณอัจฉริยะ 6 ประตู ป้องกัน Noise ขยะ และส่งต่อเฉพาะของจริง</p>
                </div>
              </div>
              <button
                onClick={() => setShowTriageModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Funnel Metrics */}
            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const full = triageStats?.byAction?.find(a => a.action === 'FULL_PIPELINE');
                const titleOnly = triageStats?.byAction?.find(a => a.action === 'TITLE_ONLY');
                const dropped = triageStats?.byAction?.find(a => a.action === 'DROPPED');
                return (
                  <>
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1">
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">🚀 Full Pipeline (≥70)</div>
                      <div className="text-2xl font-black text-white">{full?.count || 0}</div>
                      <div className="text-[11px] text-slate-400">ดึงข่าวเสริม + สรุป AI เต็มสูบ</div>
                    </div>
                    <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 text-center space-y-1">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">📝 Title-Only (30-69)</div>
                      <div className="text-2xl font-black text-white">{titleOnly?.count || 0}</div>
                      <div className="text-[11px] text-slate-400">บันทึกหัวข้อ/Macro ประหยัดโควต้า</div>
                    </div>
                    <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 text-center space-y-1">
                      <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">🚫 Silent Drop (&lt;30)</div>
                      <div className="text-2xl font-black text-white">{dropped?.count || 0}</div>
                      <div className="text-[11px] text-slate-400">ปัดตก Noise/Clickbait ทันที</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Filter Pills for Log */}
            <div className="flex items-center justify-between gap-3 border-b border-[#1F2233] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">คัดกรอง:</span>
                {['all', 'FULL_PIPELINE', 'TITLE_ONLY', 'DROPPED'].map((act) => (
                  <button
                    key={act}
                    onClick={() => setTriageActionFilter(act)}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                      triageActionFilter === act
                        ? "bg-[#823AFD] text-white"
                        : "bg-[#0F111A] text-slate-400 hover:text-white border border-[#1F2233]"
                    )}
                  >
                    {act === 'all' ? 'ทั้งหมด' : act}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchTriageData}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช
              </button>
            </div>

            {/* Triage Log Table */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {triageLog
                .filter(item => triageActionFilter === 'all' || item.triage_action === triageActionFilter)
                .map((row, idx) => (
                  <div 
                    key={idx} 
                    className="bg-[#0A0C12] border border-[#1F2233] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="font-semibold text-white leading-snug">{row.title}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-slate-500">{row.detected_at}</span>
                        {Array.isArray(row.triage_tags) && row.triage_tags.map((tg: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {tg}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-lg font-mono font-black text-xs border",
                        row.triage_score >= 70 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                        row.triage_score >= 30 ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                        "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      )}>
                        {row.triage_score} pts
                      </span>
                      <span className={clsx(
                        "px-2.5 py-1 rounded-lg font-bold text-xs uppercase tracking-wider border",
                        row.triage_action === 'FULL_PIPELINE' ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40" :
                        row.triage_action === 'TITLE_ONLY' ? "bg-amber-600/20 text-amber-300 border-amber-500/40" :
                        "bg-slate-800 text-slate-400 border-slate-700"
                      )}>
                        {row.triage_action}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Watchlist Manager Modal */}
      {showWatchlistModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A2E45] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">Watchlist Manager</h3>
                  <p className="text-xs text-slate-400">หุ้นใน Watchlist จะได้รับคะแนน Triage +50 pts อัตโนมัติ</p>
                </div>
              </div>
              <button
                onClick={() => setShowWatchlistModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Add New Ticker Form */}
            <form onSubmit={handleAddWatchlist} className="bg-[#0F111A] border border-[#1F2233] p-4 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-[#823AFD]" /> เพิ่มหุ้นเฝ้าระวังใหม่
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="เช่น PLTR"
                  value={newWatchlistTicker}
                  onChange={(e) => setNewWatchlistTicker(e.target.value.toUpperCase())}
                  className="bg-[#0A0C12] border border-[#1F2233] focus:border-[#823AFD] text-xs text-white px-3 py-2 rounded-xl outline-none font-mono"
                  required
                />
                <input
                  type="text"
                  placeholder="หมายเหตุ (เช่น รอจังหวะย่อ)"
                  value={newWatchlistNote}
                  onChange={(e) => setNewWatchlistNote(e.target.value)}
                  className="col-span-2 bg-[#0A0C12] border border-[#1F2233] focus:border-[#823AFD] text-xs text-white px-3 py-2 rounded-xl outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#823AFD] hover:bg-[#6D28D9] text-white text-xs font-bold transition-all"
              >
                + บันทึกเข้า Watchlist
              </button>
            </form>

            {/* Active Watchlist Chips */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">หุ้นทั้งหมดในระบบ Watchlist:</div>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {watchlistData.allWatchlist.map((sym) => {
                  const isCustom = watchlistData.customList.some(c => c.symbol === sym);
                  return (
                    <div 
                      key={sym}
                      className="px-3 py-1.5 rounded-xl bg-[#0F111A] border border-[#1F2233] flex items-center gap-2 text-xs font-mono"
                    >
                      <span className="font-black text-white">{sym}</span>
                      {isCustom && (
                        <button
                          onClick={() => handleDeleteWatchlist(sym)}
                          className="text-slate-500 hover:text-rose-400 transition-all"
                          title="ลบออกจาก Watchlist"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
