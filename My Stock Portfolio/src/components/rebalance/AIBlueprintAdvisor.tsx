import React, { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '../../services/api';

import { HealthRadar } from './advisor/HealthRadar';
import { SectorGapChart } from './advisor/SectorGapChart';
import { RiskGauge } from './advisor/RiskGauge';

interface AIBlueprintAdvisorProps {
  portfolioId: string;
  blueprints: any[];
  onApplySuggestion?: (suggestion: any) => void;
}

export function AIBlueprintAdvisor({ portfolioId, blueprints, onApplySuggestion }: AIBlueprintAdvisorProps) {
  const [mode, setMode] = useState<'quick' | 'deep' | 'strategist'>('strategist');
  const [loadingPhase, setLoadingPhase] = useState(0); 
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [fundamentals, setFundamentals] = useState<Record<string, any>>({});
  const [aiResult, setAiResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isStale, setIsStale] = useState(false);
  const [cachedCreatedAt, setCachedCreatedAt] = useState<string | null>(null);
  const [cachedModel, setCachedModel] = useState<string>('');
  const [modesSummary, setModesSummary] = useState<Record<string, any>>({
    strategist: null,
    deep: null,
    quick: null
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-load latest saved analysis on mount or portfolio change (defaults to highest tier mode)
  useEffect(() => {
    let isCancelled = false;

    async function loadLatest() {
      if (!portfolioId || !blueprints || blueprints.length === 0) return;

      try {
        const latest = await api.ai.latestAdvisor(portfolioId, blueprints);
        if (isCancelled) return;

        if (latest && latest.found) {
          if (latest.modesSummary) {
            setModesSummary(latest.modesSummary);
          }
          
          // Select highest available tier mode: strategist > deep > quick
          const activeMode = latest.highestMode || latest.mode || 'strategist';
          const activeData = (latest.modesSummary && latest.modesSummary[activeMode]) || latest;

          if (activeData && activeData.result) {
            setAiResult(activeData.result);
            setIsStale(Boolean(activeData.isStale));
            setCachedCreatedAt(activeData.createdAt || null);
            setCachedModel(activeData.modelUsed || '');
            setMode(activeMode as any);
            setLoadingPhase(4); // Immediately display cached results
          }

          // Silently fetch fundamentals in background if not already loaded so charts have live data
          const symbols = blueprints.map((b: any) => b.symbol).filter(Boolean);
          if (symbols.length > 0) {
            api.prices.fundamentalsBatch(symbols).then(funData => {
              if (funData && !isCancelled) setFundamentals(funData);
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[Advisor] Failed to load latest analysis:', err);
      }
    }

    // Auto-load if in welcome phase or if results already shown (to check if blueprint changed)
    if (loadingPhase === 0 || loadingPhase === 4) {
      loadLatest();
    }

    return () => {
      isCancelled = true;
    };
  }, [portfolioId, blueprints]);

  // Switch instantly if cached data exists for this mode, otherwise run analysis
  const handleSelectMode = (selectedMode: 'quick' | 'deep' | 'strategist') => {
    if (loadingPhase > 0 && loadingPhase < 4) return;

    const cachedForMode = modesSummary[selectedMode];
    if (cachedForMode && cachedForMode.result) {
      setMode(selectedMode);
      setAiResult(cachedForMode.result);
      setIsStale(Boolean(cachedForMode.isStale));
      setCachedCreatedAt(cachedForMode.createdAt || null);
      setCachedModel(cachedForMode.modelUsed || '');
      setLoadingPhase(4);
      return;
    }

    runAnalysis(selectedMode);
  };

  // Cyber Glow Badge: emerald glow for fresh saved, amber glow for stale
  const renderModeBadge = (targetMode: 'quick' | 'deep' | 'strategist') => {
    const info = modesSummary[targetMode];
    if (!info || !info.found) return null;

    if (info.isStale) {
      return (
        <span 
          title="มีข้อมูลเดิม แต่พอร์ตมีการเปลี่ยนแปลง (แนะนำกดวิเคราะห์ใหม่)"
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/60 text-[10px] font-black shadow-[0_0_8px_rgba(245,158,11,0.5)] ml-1 shrink-0"
        >
          !
        </span>
      );
    }

    return (
      <span 
        title="วิเคราะห์แล้ว ข้อมูลเป็นปัจจุบันพร้อมดู"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/70 text-[10px] font-black shadow-[0_0_10px_rgba(52,211,153,0.7)] ml-1 shrink-0 animate-pulse"
      >
        ✓
      </span>
    );
  };

  // Calculate sector weights dynamically from blueprints and fundamentals
  const portfolioSectors = useMemo(() => {
    const sectors: Record<string, number> = {};
    if (!blueprints || blueprints.length === 0) return sectors;

    let totalPct = 0;
    blueprints.forEach((b: any) => {
      const pct = Number(b.target_percent) || 0;
      totalPct += pct;
      const f = fundamentals[b.symbol];
      const sector = f?.sector || b.category || 'Other';
      sectors[sector] = (sectors[sector] || 0) + pct;
    });

    // Normalize to 100% scale if totalPct > 0
    if (totalPct > 0 && Math.abs(totalPct - 100) > 1) {
      Object.keys(sectors).forEach(k => {
        sectors[k] = Number(((sectors[k] / totalPct) * 100).toFixed(1));
      });
    }

    return sectors;
  }, [blueprints, fundamentals]);

  // Calculate weighted average beta
  const weightedBeta = useMemo(() => {
    if (!blueprints || blueprints.length === 0) return 1.0;
    let totalWeight = 0;
    let sumBeta = 0;

    blueprints.forEach((b: any) => {
      const weight = Number(b.target_percent) || 0;
      const f = fundamentals[b.symbol];
      const beta = typeof f?.beta === 'number' && f.beta > 0 ? f.beta : 1.0;
      sumBeta += weight * beta;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Number((sumBeta / totalWeight).toFixed(2)) : 1.0;
  }, [blueprints, fundamentals]);

  // Quick scan evaluation engine (rule-based, fast, runs locally with Thai advice)
  const computeQuickScan = (funData: Record<string, any>) => {
    const count = blueprints.length;
    const sorted = [...blueprints].sort((a, b) => (b.target_percent || 0) - (a.target_percent || 0));
    const top1 = sorted[0];
    const top2Sum = (sorted[0]?.target_percent || 0) + (sorted[1]?.target_percent || 0);

    const strengths: { title: string; description: string }[] = [];
    const weaknesses: { title: string; description: string }[] = [];
    const suggestions: any[] = [];

    // Check diversification
    if (count >= 5 && top2Sum <= 45) {
      strengths.push({ 
        title: 'การกระจายตัวของพอร์ตสมดุลดี', 
        description: `หุ้น 2 อันดับแรกมีสัดส่วนรวมกันเพียง ${top2Sum.toFixed(1)}% ของพอร์ต ช่วยลดความเสี่ยงจากการพึ่งพาหุ้นตัวใดตัวหนึ่ง` 
      });
    } else if (top1 && top1.target_percent > 30) {
      weaknesses.push({ 
        title: 'ความเสี่ยงจากการกระจุกตัวในหุ้นรายตัวสูง', 
        description: `หุ้น ${top1.symbol} มีสัดส่วนสูงถึง ${top1.target_percent}% ซึ่งเกินเกณฑ์ปลอดภัยที่ 30% ของพอร์ต` 
      });
      suggestions.push({
        action: 'REDUCE',
        symbol: top1.symbol,
        percent: Math.round(top1.target_percent - 20),
        category: top1.category || 'Core',
        reason: 'ปรับลดสัดส่วนเพื่อกระจายความเสี่ยงและลดผลกระทบหากหุ้นแกว่งตัวแรง'
      });
    }

    // Check Sector Overlap
    const sectorEntries = Object.entries(portfolioSectors);
    const dominantSector = sectorEntries.sort((a, b) => b[1] - a[1])[0];
    if (dominantSector && dominantSector[1] > 45) {
      weaknesses.push({ 
        title: 'สัดส่วนกระจุกตัวในกลุ่มอุตสาหกรรมเดียว', 
        description: `กลุ่มอุตสาหกรรม ${dominantSector[0]} มีสัดส่วนสูงถึง ${dominantSector[1]}% ของพอร์ตโดยรวม` 
      });
    } else if (sectorEntries.length >= 3) {
      strengths.push({ 
        title: 'กระจายการลงทุนหลากหลายภาคธุรกิจ', 
        description: `พอร์ตมีการกระจายความเสี่ยงครอบคลุม ${sectorEntries.length} ภาคอุตสาหกรรมหลัก` 
      });
    }

    // Check Beta
    if (weightedBeta > 1.35) {
      weaknesses.push({ 
        title: 'ความผันผวนสูงกว่าตลาดอย่างมีนัยสำคัญ', 
        description: `ค่าเฉลี่ย Beta รวมของพอร์ตอยู่ที่ ${weightedBeta} ซึ่งมีโอกาสแกว่งตัวรุนแรงในภาวะตลาดผันผวน` 
      });
    } else if (weightedBeta >= 0.85 && weightedBeta <= 1.15) {
      strengths.push({ 
        title: 'ระดับความผันผวนสอดคล้องกับดัชนีตลาด', 
        description: `ค่าเฉลี่ย Beta รวมของพอร์ตอยู่ที่ ${weightedBeta} เคลื่อนไหวใกล้เคียงกับดัชนีภาพรวม ไม่เสี่ยงสูงเกินไป` 
      });
    }

    // Calculate score
    let score = 80;
    if (top1 && top1.target_percent > 35) score -= 15;
    if (dominantSector && dominantSector[1] > 50) score -= 15;
    if (weightedBeta > 1.4) score -= 10;
    if (count < 4) score -= 15;
    if (count >= 8) score += 5;
    score = Math.max(30, Math.min(95, score));

    let overallGrade = 'B+';
    if (score >= 90) overallGrade = 'A';
    else if (score >= 82) overallGrade = 'A-';
    else if (score >= 75) overallGrade = 'B+';
    else if (score >= 68) overallGrade = 'B';
    else if (score >= 60) overallGrade = 'C';
    else overallGrade = 'D';

    const riskScore = Math.round(Math.min(100, Math.max(10, (weightedBeta * 40) + (top1?.target_percent || 0))));

    return {
      overallGrade,
      radarData: {
        diversification: Math.min(100, count * 12),
        valuation: 70,
        growth: Math.round(Math.min(100, weightedBeta * 60)),
        risk: Math.round(100 - riskScore),
        income: 50
      },
      strengths,
      weaknesses,
      suggestions,
      missingExposure: sectorEntries.length < 4 ? ['Healthcare', 'Financials', 'Defensive'] : [],
      riskScore
    };
  };

  const runAnalysis = async (selectedMode: 'quick' | 'deep' | 'strategist') => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setMode(selectedMode);
      setLoadingPhase(1); 
      setProgress(15);
      setError('');
      setStatusMessage('กำลังวิเคราะห์โครงสร้างเป้าหมาย Blueprint และสัดส่วนพอร์ต...');

      // Step 1: Fetch fundamentals batch for all blueprint symbols
      const symbols = blueprints.map((b: any) => b.symbol).filter(Boolean);
      let funData = fundamentals;

      if (Object.keys(funData).length === 0 || symbols.some(s => !funData[s])) {
        setLoadingPhase(2);
        setProgress(35);
        const displaySymbols = symbols.slice(0, 4).join(', ') + (symbols.length > 4 ? ` +อีก ${symbols.length - 4} ตัว` : '');
        setStatusMessage(`กำลังดึงข้อมูลราคาตลาดและ Fundamental จาก Yahoo Finance (${displaySymbols})...`);
        
        try {
          funData = await api.prices.fundamentalsBatch(symbols);
          setFundamentals(funData);
        } catch (fErr) {
          console.warn('[Advisor] Fundamentals fetch non-blocking fallback:', fErr);
        }
      }

      setProgress(55);
      setStatusMessage(`กำลังประมวลผล 5-Axis Health Metrics และวิเคราะห์การกระจายตัว (Beta: ${weightedBeta})...`);

      if (selectedMode === 'quick') {
        setLoadingPhase(3);
        setProgress(85);
        setStatusMessage('กำลังประมวลผลกฎ Rule-Engine และตรวจสอบเกณฑ์ความเสี่ยง...');
        const result = computeQuickScan(funData);
        setTimeout(() => {
          setAiResult(result);
          setIsStale(false);
          const nowIso = new Date().toISOString();
          setCachedCreatedAt(nowIso);
          setLoadingPhase(4);
          setProgress(100);
          setStatusMessage('วิเคราะห์เสร็จสมบูรณ์');
          setModesSummary(prev => ({
            ...prev,
            quick: {
              found: true,
              isStale: false,
              mode: 'quick',
              blueprint_hash: '',
              overallGrade: result.overallGrade,
              result,
              modelUsed: 'rule-engine',
              createdAt: nowIso
            }
          }));
          api.ai.saveAdvisorHistory(portfolioId, 'quick', blueprints, result).catch(e => {
            console.warn('[Advisor] Quick scan auto-save error:', e);
          });
        }, 500);
        return;
      }

      // Step 2: Call AI Backend Advisor
      setLoadingPhase(3);
      setProgress(70);
      setStatusMessage(
        selectedMode === 'strategist'
          ? 'กำลังเชื่อมต่อ Hermes: GPT 5.6 Terra (Chief Strategist Engine)...'
          : 'กำลังส่งข้อมูลให้ Hermes: GPT 5.6 Terra วิเคราะห์เชิงลึก...'
      );

      // Simulation timer for dynamic feeling during AI generation
      let currentP = 70;
      const statusSteps = [
        'กำลังวิเคราะห์สภาวะเศรษฐกิจมหภาคและทิศทางอัตราดอกเบี้ย...',
        selectedMode === 'strategist' 
          ? 'กำลังสร้างพิมพ์เขียวในอุดมคติ (Ideal Blueprint: Before vs After)...'
          : 'กำลังตรวจสอบจุดแข็งและจุดเปราะบางของพอร์ต...',
        'กำลังจัดทำแผนกลยุทธ์และขั้นตอน Action Roadmap...',
        'กำลังสังเคราะห์และตรวจสอบความสมบูรณ์ของผลการวิเคราะห์...'
      ];
      let stepIdx = 0;

      timerRef.current = setInterval(() => {
        if (currentP < 92) {
          currentP += 4;
          setProgress(currentP);
          if (stepIdx < statusSteps.length) {
            setStatusMessage(statusSteps[stepIdx]);
            stepIdx++;
          }
        }
      }, 3500);

      const aiRes = await api.ai.advisor(selectedMode, blueprints, funData, portfolioId);

      if (timerRef.current) clearInterval(timerRef.current);
      
      // Merge calculated fallback radar if AI didn't return one
      if (!aiRes.radarData) {
        aiRes.radarData = {
          diversification: Math.min(100, blueprints.length * 12),
          valuation: 70,
          growth: 75,
          risk: 100 - (aiRes.riskScore || 50),
          income: 50
        };
      }

      setStatusMessage('เสร็จสิ้นการวิเคราะห์ กำลังแสดงผล...');
      setProgress(100);
      setAiResult(aiRes);
      setIsStale(false);
      const nowIso = new Date().toISOString();
      setCachedCreatedAt(nowIso);
      setLoadingPhase(4); 
      setModesSummary(prev => ({
        ...prev,
        [selectedMode]: {
          found: true,
          isStale: false,
          mode: selectedMode,
          blueprint_hash: '',
          overallGrade: aiRes.overallGrade,
          result: aiRes,
          modelUsed: selectedMode === 'strategist' ? 'GPT-5.6 Terra (Strategist)' : 'GPT-5.6 Terra',
          createdAt: nowIso
        }
      })); 
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      console.error('[Advisor UI Error]:', err);
      setError(err.message || 'การวิเคราะห์ขัดข้อง กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง');
      setLoadingPhase(0);
    }
  };

  const getGradeColor = (grade: string) => {
    if (!grade) return 'text-sky-400';
    if (grade.startsWith('A')) return 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]';
    if (grade.startsWith('B')) return 'text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]';
    if (grade.startsWith('C')) return 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]';
    return 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]';
  };

  return (
    <div className="bg-[#181B2A] border border-[#232738] rounded-xl p-4 md:p-6 mb-8 mt-4 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🧠</span> AI Portfolio Advisor
          </h2>
          <p className="text-[13px] text-slate-300 mt-1">
            วิเคราะห์ Blueprint เชิงลึก ตรวจสอบความสมดุล จุดแข็ง จุดเสี่ยง และแนวทางปรับพอร์ตให้เหมาะสม
          </p>
        </div>
        
        <div className="flex bg-[#12141F] rounded-lg p-1 border border-[#232738] gap-1">
          <button 
            onClick={() => handleSelectMode('quick')}
            className={`px-3 py-1.5 rounded-md text-[13px] font-bold transition-all flex items-center gap-1.5 ${
              mode === 'quick' && loadingPhase > 0 ? 'bg-slate-700 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>⚡ Quick Scan</span>
            {renderModeBadge('quick')}
          </button>
          <button 
            onClick={() => handleSelectMode('deep')}
            className={`px-3 py-1.5 rounded-md text-[13px] font-bold transition-all flex items-center gap-1.5 ${
              mode === 'deep' && loadingPhase > 0 ? 'bg-[#A855F7] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🧠 Deep Analysis</span>
            {renderModeBadge('deep')}
          </button>
          <button 
            onClick={() => handleSelectMode('strategist')}
            className={`px-3 py-1.5 rounded-md text-[13px] font-bold transition-all flex items-center gap-1.5 ${
              mode === 'strategist' && loadingPhase > 0 ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🎯 Strategist</span>
            {renderModeBadge('strategist')}
          </button>
        </div>
      </div>

      {/* Dynamic Progress Bar */}
      {loadingPhase > 0 && loadingPhase < 4 && (
        <div className="mb-6 p-4 bg-[#12141F] rounded-lg border border-[#232738] shadow-inner">
          <div className="flex justify-between items-center text-[13px] mb-2.5">
            <div className="flex items-center gap-2 text-slate-200 font-semibold min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
              </span>
              <span className="truncate">{statusMessage || 'กำลังประมวลผล...'}</span>
            </div>
            <span className="text-[#A855F7] font-bold shrink-0 ml-3">{progress}%</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-[#A855F7] to-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-rose-300 text-[13px] font-medium mb-6">
          ⚠️ {error}
        </div>
      )}

      {/* Welcome State */}
      {loadingPhase === 0 && (
        <div className="text-center py-10">
          <p className="text-[13px] text-slate-300 mb-4 max-w-md mx-auto">
            กดเลือกโหมดเพื่อเริ่มให้ AI และ Rule-Engine ตรวจสอบความแข็งแกร่งของสัดส่วนเป้าหมายใน Blueprint
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button 
              onClick={() => handleSelectMode('quick')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[13px] font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-2"
            >
              <span>⚡ Quick Scan (เร็วทันใจ)</span>
              {renderModeBadge('quick')}
            </button>
            <button 
              onClick={() => handleSelectMode('deep')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#A855F7] to-blue-600 hover:opacity-90 text-white text-[13px] font-bold rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2"
            >
              <span>🧠 Deep Analysis</span>
              {renderModeBadge('deep')}
            </button>
            <button 
              onClick={() => handleSelectMode('strategist')}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:opacity-90 text-white text-[13px] font-bold rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all flex items-center gap-2"
            >
              <span>🎯 Full Strategist (พิมพ์เขียว + Roadmap)</span>
              {renderModeBadge('strategist')}
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {loadingPhase === 4 && aiResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Stale Blueprint Warning Banner */}
          {isStale && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-start sm:items-center gap-3">
                <span className="text-xl shrink-0 mt-0.5 sm:mt-0">⚠️</span>
                <div>
                  <div className="text-[14px] font-bold text-amber-300">
                    สัดส่วนพอร์ตหรือรายการหุ้นมีการเปลี่ยนแปลง
                  </div>
                  <div className="text-[13px] text-slate-200 mt-0.5">
                    ผลการวิเคราะห์นี้อ้างอิงจาก Blueprint เดิม{cachedCreatedAt ? ` (${new Date(cachedCreatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})` : ''} แนะนำให้กดวิเคราะห์ใหม่เพื่อให้ได้คำแนะนำที่ตรงกับพอร์ตปัจจุบัน
                  </div>
                </div>
              </div>
              <button
                onClick={() => runAnalysis(mode)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[13px] shrink-0 transition-colors shadow flex items-center gap-1.5 self-end sm:self-auto"
              >
                <span>🔄</span> วิเคราะห์ใหม่ทันที
              </button>
            </div>
          )}

          {/* Up-to-date Meta Info Strip */}
          {!isStale && cachedCreatedAt && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#12141F] border border-[#232738] rounded-lg text-[13px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span className="text-slate-200 font-medium">ผลวิเคราะห์ล่าสุด</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">
                  โหมด: <span className="font-semibold text-white capitalize">{mode === 'strategist' ? '🎯 Strategist' : mode === 'deep' ? '🧠 Deep Analysis' : '⚡ Quick Scan'}</span>
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">
                  เมื่อ {new Date(cachedCreatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                onClick={() => runAnalysis(mode)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-[13px] border border-slate-700 transition-colors flex items-center gap-1"
              >
                <span>🔄</span> วิเคราะห์ใหม่
              </button>
            </div>
          )}

          {/* Strategist Section 1: Macro & Market Environment Context */}
          {aiResult.macroAnalysis && (
            <div className="border border-purple-500/30 rounded-lg p-5 bg-gradient-to-r from-purple-950/25 via-[#181B2A] to-blue-950/20 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 gap-2">
                <h3 className="text-purple-300 font-bold text-sm flex items-center gap-2">
                  <span className="text-base">🌐</span> การวิเคราะห์ภาพรวมเศรษฐกิจและธีมตลาด (Macro & Market Context)
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 self-start sm:self-auto">
                  CHIEF STRATEGIST PERSPECTIVE
                </span>
              </div>
              <p className="text-[14px] text-slate-200 leading-relaxed font-normal">
                {aiResult.macroAnalysis}
              </p>
            </div>
          )}

          {/* Row 1: Grade Card & Radar Chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 border border-slate-700 rounded-lg p-5 flex flex-col items-center justify-center bg-[#12141F]">
              <div className="text-[13px] font-bold text-slate-300 mb-2">Overall Grade</div>
              <div className={`text-6xl font-black ${getGradeColor(aiResult.overallGrade)}`}>
                {aiResult.overallGrade || 'B'}
              </div>
              <div className="text-[13px] text-slate-300 mt-3 text-center">
                {aiResult.overallGrade?.startsWith('A') ? 'พอร์ตมีความสมดุลและคุณภาพสูง' :
                 aiResult.overallGrade?.startsWith('B') ? 'โครงสร้างดี มีจุดที่สามารถปรับให้แกร่งขึ้นได้' :
                 'ควรกระจายความเสี่ยงและลดการกระจุกตัว'}
              </div>
            </div>
            <div className="col-span-2 border border-slate-700 rounded-lg p-4 bg-[#12141F]">
              <div className="text-[13px] font-bold text-slate-200 mb-1 px-2">5-Axis Portfolio Health Radar</div>
              <HealthRadar data={aiResult.radarData || {
                diversification: 75,
                valuation: 70,
                growth: 70,
                risk: 65,
                income: 50
              }} />
            </div>
          </div>
          
          {/* Row 2: Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-emerald-500/30 rounded-lg p-4 bg-emerald-500/5">
              <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm">
                💪 จุดแข็ง (Strengths)
              </h3>
              <ul className="space-y-3">
                {aiResult.strengths?.map((s: any, i: number) => (
                  <li key={i} className="text-[13px] text-slate-200 flex items-start gap-2.5">
                    <span className="text-emerald-400 font-black text-sm shrink-0 mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-white">{s.title}: </span>
                      <span className="text-slate-200">{s.description}</span>
                    </div>
                  </li>
                ))}
                {(!aiResult.strengths || aiResult.strengths.length === 0) && (
                  <li className="text-[13px] text-slate-300">ยังไม่พบจุดแข็งที่โดดเด่น</li>
                )}
              </ul>
            </div>
            <div className="border border-rose-500/30 rounded-lg p-4 bg-rose-500/5">
              <h3 className="text-rose-400 font-bold mb-3 flex items-center gap-2 text-sm">
                ⚠️ จุดเสี่ยงที่ควรระวัง (Weaknesses)
              </h3>
              <ul className="space-y-3">
                {aiResult.weaknesses?.map((w: any, i: number) => (
                  <li key={i} className="text-[13px] text-slate-200 flex items-start gap-2.5">
                    <span className="text-rose-400 font-black text-sm shrink-0 mt-0.5">!</span>
                    <div>
                      <span className="font-bold text-white">{w.title}: </span>
                      <span className="text-slate-200">{w.description}</span>
                    </div>
                  </li>
                ))}
                {(!aiResult.weaknesses || aiResult.weaknesses.length === 0) && (
                  <li className="text-[13px] text-slate-300">ไม่พบจุดเสี่ยงที่มีนัยสำคัญ</li>
                )}
              </ul>
            </div>
          </div>

          {/* Strategist Section 2: Ideal Blueprint (Before vs After) Table */}
          {aiResult.idealBlueprint && aiResult.idealBlueprint.length > 0 && (
            <div className="border border-amber-500/30 rounded-lg p-5 bg-[#12141F]">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                <div>
                  <h3 className="text-amber-400 font-bold text-sm flex items-center gap-2">
                    <span className="text-base">🎯</span> พิมพ์เขียวเป้าหมายเชิงกลยุทธ์ (Ideal Blueprint: Before vs After)
                  </h3>
                  <p className="text-[13px] text-slate-300 mt-0.5">
                    เปรียบเทียบสัดส่วนเป้าหมายปัจจุบันกับสัดส่วนในอุดมคติที่ AI Strategist แนะนำเพื่อปรับสมดุลและลดความเสี่ยง
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 self-start sm:self-auto">
                  OPTIMIZED ALLOCATION
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#232738] text-[13px] text-slate-300">
                      <th className="py-2.5 px-3 font-semibold">สินทรัพย์ (Asset)</th>
                      <th className="py-2.5 px-3 font-semibold">บทบาทเชิงกลยุทธ์ (Role)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">สัดส่วนปัจจุบัน</th>
                      <th className="py-2.5 px-3 font-semibold text-right">สัดส่วนแนะนำ</th>
                      <th className="py-2.5 px-3 font-semibold text-center">ส่วนต่าง (Delta)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232738]/60">
                    {aiResult.idealBlueprint.map((item: any, idx: number) => {
                      const change = Number(item.change ?? (item.idealPercent - item.currentPercent));
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-[14px]">{item.symbol}</div>
                          </td>
                          <td className="py-3 px-3 text-[13px] text-slate-200">
                            {item.role || 'แกนหลักการเติบโต'}
                          </td>
                          <td className="py-3 px-3 text-[13px] text-slate-300 font-semibold text-right">
                            {item.currentPercent}%
                          </td>
                          <td className="py-3 px-3 text-[14px] text-white font-bold text-right">
                            {item.idealPercent}%
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                              change > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              change < 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-slate-700/50 text-slate-300 border border-slate-600'
                            }`}>
                              {change > 0 ? `+${change.toFixed(1)}%` : change < 0 ? `${change.toFixed(1)}%` : 'คงที่ (0%)'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Strategist Section 3: Action Roadmap */}
          {aiResult.actionRoadmap && aiResult.actionRoadmap.length > 0 && (
            <div>
              <h3 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                <span>🗺️</span> แผนปฏิบัติการรายระยะ (Strategic Action Roadmap)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiResult.actionRoadmap.map((step: any, i: number) => (
                  <div key={i} className="border border-[#232738] bg-[#12141F] rounded-lg p-4 flex flex-col justify-between hover:border-purple-500/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black flex items-center justify-center border border-purple-500/40">
                          {i + 1}
                        </span>
                        <h4 className="font-bold text-white text-[13px]">
                          {step.phase}
                        </h4>
                      </div>
                      <p className="text-[13px] text-slate-200 leading-relaxed font-normal">
                        {step.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Row 3: Risk Gauge & Sector Gap Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-700 rounded-lg p-4 bg-[#12141F]">
              <RiskGauge score={aiResult.riskScore || 50} beta={weightedBeta} />
            </div>
            <div className="border border-slate-700 rounded-lg p-4 bg-[#12141F] overflow-x-auto">
              <SectorGapChart portfolioSectors={portfolioSectors} />
            </div>
          </div>

          {/* Missing Exposures Tags if available */}
          {aiResult.missingExposure && aiResult.missingExposure.length > 0 && (
            <div className="border border-[#232738] bg-[#12141F] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-[13px] font-semibold text-slate-300 flex items-center gap-2">
                <span>🔍</span> กลุ่มอุตสาหกรรม/สินทรัพย์ที่แนะนำให้พิจารณาเพิ่ม:
              </div>
              <div className="flex flex-wrap gap-2">
                {aiResult.missingExposure.map((exp: string, idx: number) => (
                  <span key={idx} className="text-xs font-bold px-3 py-1 bg-slate-800 text-slate-200 rounded-full border border-slate-700">
                    + {exp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Actionable Suggestions */}
          {aiResult.suggestions && aiResult.suggestions.length > 0 && (
            <div>
              <h3 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                🔧 คำแนะนำปรับสัดส่วน (Actionable Suggestions)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiResult.suggestions.map((s: any, i: number) => (
                  <div key={i} className="border border-[#232738] bg-[#12141F] rounded-lg p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                          s.action === 'ADD' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                          s.action === 'REDUCE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          s.action === 'SWAP' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {s.action}
                        </span>
                        <span className="font-bold text-white text-[14px]">{s.symbol} {s.percent}%</span>
                      </div>
                      <p className="text-[13px] text-slate-200 mb-4 leading-relaxed font-normal">{s.reason}</p>
                    </div>
                    <button 
                      onClick={() => onApplySuggestion && onApplySuggestion(s)}
                      className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded text-[13px] font-bold transition-colors border border-emerald-500/30"
                    >
                      นำคำแนะนำไปปรับใช้
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
