import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Flame, Sparkles, Filter, CheckCheck, RefreshCw, ExternalLink, 
  Clock, ShieldAlert, BookOpen, Layers, Search, Check, ChevronDown, 
  ChevronUp, BarChart2, Eye, EyeOff
} from 'lucide-react';
import clsx from 'clsx';

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

export const NewsIntelPage: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [timingStats, setTimingStats] = useState<TimingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showTimingModal, setShowTimingModal] = useState(false);

  // Filters
  const [selectedPortfolio, setSelectedPortfolio] = useState<'all' | 'main' | 'tiger' | 'global'>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'the_must' | 'focus' | 'good_to_know' | 'optional'>('focus');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPortfolio !== 'all') params.append('portfolio', selectedPortfolio);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      if (unreadOnly) params.append('unread_only', 'true');
      if (searchQuery.trim()) params.append('ticker', searchQuery.trim().toUpperCase());

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
  }, [selectedPortfolio, selectedPriority, unreadOnly, searchQuery]);

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

  useEffect(() => {
    fetchNews();
    fetchStats();
  }, [fetchNews]);

  const handleMarkAsRead = async (id: number, currentRead: number) => {
    try {
      // Optimistic update
      setItems(prev => prev.map(item => item.id === id ? { ...item, is_read: currentRead ? 0 : 1 } : item));
      await fetch(`/api/news/${id}/read`, { method: 'POST' });
      fetchStats();
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
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleScanNow = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/news/scan', { method: 'POST' });
      if (res.ok) {
        await Promise.all([fetchNews(), fetchStats(), fetchTiming()]);
      }
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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

                      {/* Ticker Pill */}
                      <span className="px-3 py-1 rounded-lg text-xs font-mono font-black bg-white/10 text-white border border-white/15">
                        {item.ticker}
                      </span>

                      {/* Sentiment */}
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        item.sentiment === 'bullish' && "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
                        item.sentiment === 'bearish' && "text-rose-400 bg-rose-500/10 border border-rose-500/20",
                        item.sentiment === 'neutral' && "text-slate-400 bg-slate-800 border border-slate-700"
                      )}>
                        {item.sentiment === 'bullish' ? '🟢 เชิงบวก' : item.sentiment === 'bearish' ? '🔴 เชิงลบ' : '⚪ เป็นกลาง'}
                      </span>
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
    </div>
  );
};
