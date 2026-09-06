import React, { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { useBlueprintStore } from '../../stores/blueprintStore';

import { HealthRadar } from './advisor/HealthRadar';
import { SectorGapChart } from './advisor/SectorGapChart';
import { RiskGauge } from './advisor/RiskGauge';
import { BeforeAfterDonut } from './advisor/BeforeAfterDonut';
import { StockVerdictCard } from './advisor/StockVerdictCard';
import { DrawdownMeter } from './advisor/DrawdownMeter';
import { TimelineStepper } from './advisor/TimelineStepper';

interface AIBlueprintAdvisorProps {
  portfolioId: string;
  blueprints: any[];
  onApplySuggestion?: (suggestion: any) => void;
}

export function AIBlueprintAdvisor({ portfolioId, blueprints, onApplySuggestion }: AIBlueprintAdvisorProps) {
  const [mode, setMode] = useState<'quick' | 'deep' | 'strategist'>('strategist');
  const [activeTab, setActiveTab] = useState<'plan' | 'stocks' | 'stress' | 'macro'>('plan');
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

  // Safety & Undo states for Ideal Blueprint
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);
  const [previousBlueprintBackup, setPreviousBlueprintBackup] = useState<any[] | null>(() => {
    try {
      const saved = localStorage.getItem(`ai_advisor_backup_${portfolioId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleApplyIdealBlueprint = async () => {
    if (!aiResult?.idealBlueprint || !portfolioId) return;

    try {
      setIsApplying(true);
      // 1. Snapshot previous blueprints
      const backup = blueprints.map(b => ({
        symbol: b.symbol,
        target_percent: Number(b.target_percent) || 0,
        category: b.category,
        status: b.status || 'OWNED',
        target_price: b.target_price || null,
        notes: b.notes || null
      }));
      setPreviousBlueprintBackup(backup);
      try {
        localStorage.setItem(`ai_advisor_backup_${portfolioId}`, JSON.stringify(backup));
      } catch (e) {}

      // 2. Apply all items from idealBlueprint
      const updates = aiResult.idealBlueprint.map((item: any) => {
        const symbol = item.symbol.toUpperCase();
        const existing = blueprints.find(b => b.symbol.toUpperCase() === symbol);
        return {
          portfolio_id: portfolioId,
          symbol,
          target_percent: Number(item.idealPercent) || 0,
          category: existing?.category || (symbol === 'CASH' ? 'Cash' : 'Compounders'),
          status: existing?.status || (symbol === 'CASH' ? 'OWNED' : 'WATCHLIST'),
          target_price: existing?.target_price || null,
          notes: existing?.notes || `ปรับตาม AI Strategist: ${item.role || ''}`
        };
      });

      for (const entry of updates) {
        await api.blueprints.upsert(portfolioId, entry);
      }

      // 3. Refresh store to re-render charts & rebalance table immediately
      await useBlueprintStore.getState().fetchBlueprints(portfolioId);

      setIsConfirmModalOpen(false);
      setIsApplying(false);
      setApplySuccessMessage('✅ อัปเดตสัดส่วน Blueprint ตามคำแนะนำของ AI Strategist เรียบร้อยแล้ว!');
      setTimeout(() => setApplySuccessMessage(null), 8000);
    } catch (err: any) {
      console.error('[Apply Ideal Blueprint Error]:', err);
      setIsApplying(false);
      setError(err.message || 'ไม่สามารถปรับสัดส่วนได้ กรุณาลองใหม่');
    }
  };

  const handleUndoAllocation = async () => {
    if (!previousBlueprintBackup || !portfolioId) return;

    try {
      setIsApplying(true);
      for (const entry of previousBlueprintBackup) {
        await api.blueprints.upsert(portfolioId, entry);
      }
      await useBlueprintStore.getState().fetchBlueprints(portfolioId);

      setPreviousBlueprintBackup(null);
      try {
        localStorage.removeItem(`ai_advisor_backup_${portfolioId}`);
      } catch (e) {}

      setIsApplying(false);
      setApplySuccessMessage('↩️ กู้คืนสัดส่วน Blueprint เดิมเรียบร้อยแล้ว!');
      setTimeout(() => setApplySuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('[Undo Allocation Error]:', err);
      setIsApplying(false);
      setError(err.message || 'ไม่สามารถกู้คืนสัดส่วนเดิมได้');
    }
  };

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
          const symbols = blueprints
            .map((b: any) => b.symbol)
            .filter((s: string) => s && s.toUpperCase() !== 'CASH');
          if (symbols.length > 0) {
            api.prices.fundamentalsBatch(symbols).then(funData => {
              if (funData && !isCancelled) {
                const normalized: Record<string, any> = {};
                Object.entries(funData).forEach(([k, v]) => {
                  normalized[k] = v;
                  normalized[k.toUpperCase()] = v;
                });
                setFundamentals(prev => ({ ...prev, ...normalized }));
              }
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

  // Auto-sync fundamentals for any recommended/verdict symbols not yet in memory
  useEffect(() => {
    if (!aiResult) return;

    const allSymbols = new Set<string>();
    aiResult.stockVerdicts?.forEach((v: any) => {
      if (v.symbol && v.symbol.toUpperCase() !== 'CASH') {
        allSymbols.add(v.symbol.toUpperCase());
      }
    });

    aiResult.idealBlueprint?.forEach((b: any) => {
      if (b.symbol && b.symbol.toUpperCase() !== 'CASH') {
        allSymbols.add(b.symbol.toUpperCase());
      }
    });

    const missing = Array.from(allSymbols).filter(sym => !fundamentals[sym]);
    if (missing.length > 0) {
      api.prices.fundamentalsBatch(missing).then(freshData => {
        if (freshData && Object.keys(freshData).length > 0) {
          const normalized: Record<string, any> = {};
          Object.entries(freshData).forEach(([k, v]) => {
            normalized[k] = v;
            normalized[k.toUpperCase()] = v;
          });
          setFundamentals(prev => ({ ...prev, ...normalized }));
        }
      }).catch(err => console.warn('[Advisor] Sync missing fundamentals error:', err));
    }
  }, [aiResult]);

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

  // Calculate cash percent
  const cashPercent = useMemo(() => {
    if (!blueprints || blueprints.length === 0) return 0;
    const cashBp = blueprints.find((b: any) => b.symbol?.toUpperCase() === 'CASH');
    return Number(cashBp?.target_percent) || 0;
  }, [blueprints]);

  // Calculate weighted average P/E
  const weightedPE = useMemo(() => {
    if (!blueprints || blueprints.length === 0) return null;
    let totalWeight = 0;
    let sumPE = 0;
    blueprints.forEach((b: any) => {
      const weight = Number(b.target_percent) || 0;
      const f = fundamentals[b.symbol];
      const pe = f?.pe_trailing || f?.pe_forward || 0;
      if (pe > 0 && pe < 250) {
        sumPE += weight * pe;
        totalWeight += weight;
      }
    });
    return totalWeight > 0 ? Number((sumPE / totalWeight).toFixed(1)) : null;
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

      // Step 1: Fetch fundamentals batch for all blueprint symbols (excluding CASH)
      const symbols = blueprints
        .map((b: any) => b.symbol)
        .filter((s: string) => s && s.toUpperCase() !== 'CASH');
      let funData = { ...fundamentals };

      const missing = symbols.filter(s => !funData[s] && !funData[s.toUpperCase()]);
      if (missing.length > 0) {
        setLoadingPhase(2);
        setProgress(35);
        const displaySymbols = missing.slice(0, 4).join(', ') + (missing.length > 4 ? ` +อีก ${missing.length - 4} ตัว` : '');
        setStatusMessage(`กำลังดึงข้อมูลราคาตลาดและ Fundamental จาก Yahoo Finance (${displaySymbols})...`);
        
        try {
          const fresh = await api.prices.fundamentalsBatch(missing);
          if (fresh) {
            Object.entries(fresh).forEach(([k, v]) => {
              funData[k] = v;
              funData[k.toUpperCase()] = v;
            });
            setFundamentals(prev => ({ ...prev, ...funData }));
          }
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

      const aiRes = await api.ai.advisor(selectedMode, blueprints, funData, portfolioId, true);

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

          {/* ========================================================= */}
          {/* 🏅 LAYER 1: EXECUTIVE INVESTMENT COCKPIT (Always on Top) */}
          {/* ========================================================= */}
          <div className="bg-[#12141F] border border-[#232738] rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#232738] pb-3">
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <span className="text-xl">🏅</span> Executive Investment Cockpit
                </h3>
                <p className="text-[13px] text-slate-300 mt-0.5">
                  สรุปผลประเมินสุขภาพพอร์ตโดยรวม 5 มิติ และตัวชี้วัดความเสี่ยงสำคัญ
                </p>
              </div>
              {aiResult.portfolioStyle && (
                <div className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-purple-500/40 rounded-full text-purple-200 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                  <span>📊</span> Style: {aiResult.portfolioStyle}
                </div>
              )}
            </div>

            {/* Cockpit Grid: Grade (col 1) + 5-Axis Radar (col 2-3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* Grade Card */}
              <div className="col-span-1 border border-[#2A2E45] rounded-xl p-5 flex flex-col items-center justify-center bg-[#181B2A]/80 shadow-inner">
                <div className="text-[13px] font-bold text-slate-300 mb-1 tracking-wider uppercase">Overall Grade</div>
                <div className={`text-6xl font-black ${getGradeColor(aiResult.overallGrade)} my-1`}>
                  {aiResult.overallGrade || 'B'}
                </div>
                <div className="text-[13px] text-slate-200 text-center font-medium mt-1">
                  {aiResult.overallGrade?.startsWith('A') ? 'พอร์ตสมดุลสูง ศักยภาพการเติบโตยอดเยี่ยม' :
                   aiResult.overallGrade?.startsWith('B') ? 'โครงสร้างดี มีจุดที่สามารถปรับให้แกร่งขึ้นได้' :
                   'ควรกระจายความเสี่ยงและลดการกระจุกตัว'}
                </div>
              </div>

              {/* 5-Axis Health Radar */}
              <div className="col-span-2 border border-[#2A2E45] rounded-xl p-4 bg-[#181B2A]/80 shadow-inner">
                <div className="flex items-center justify-between mb-1 px-2">
                  <span className="text-[13px] font-bold text-slate-200">5-Axis Portfolio Health Radar</span>
                  <span className="text-xs text-slate-400 font-semibold">คะแนนเต็ม 100</span>
                </div>
                <HealthRadar data={aiResult.radarData || {
                  diversification: 75,
                  valuation: 70,
                  growth: 70,
                  risk: 65,
                  income: 50
                }} />
              </div>
            </div>

            {/* Key Metric Badges Strip (4 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-[#181B2A] border border-[#2A2E45] rounded-lg p-3 flex flex-col justify-between">
                <div className="text-xs text-slate-400 font-semibold">Weighted Beta (β)</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-white">{weightedBeta.toFixed(2)}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    weightedBeta > 1.35 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {weightedBeta > 1.35 ? 'High Vol' : 'Balanced'}
                  </span>
                </div>
              </div>

              <div className="bg-[#181B2A] border border-[#2A2E45] rounded-lg p-3 flex flex-col justify-between">
                <div className="text-xs text-slate-400 font-semibold">Weighted P/E</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-purple-300">
                    {weightedPE !== null ? `${weightedPE}x` : 'N/A'}
                  </span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Valuation
                  </span>
                </div>
              </div>

              <div className="bg-[#181B2A] border border-[#2A2E45] rounded-lg p-3 flex flex-col justify-between">
                <div className="text-xs text-slate-400 font-semibold">Risk Score</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-white">
                    {aiResult.riskScore || 50}<span className="text-xs text-slate-400 font-normal">/100</span>
                  </span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    (aiResult.riskScore || 50) > 65 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {(aiResult.riskScore || 50) > 65 ? 'Elevated' : 'Moderate'}
                  </span>
                </div>
              </div>

              <div className="bg-[#181B2A] border border-[#2A2E45] rounded-lg p-3 flex flex-col justify-between">
                <div className="text-xs text-slate-400 font-semibold">Cash Allocation</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-emerald-400">{cashPercent}%</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    cashPercent >= 10 && cashPercent <= 25 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {cashPercent > 25 ? 'Excess' : cashPercent < 5 ? 'Low Buffer' : 'Optimal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Alert Banners: Concentration & Dividend Health */}
            {(aiResult.concentrationRisk || aiResult.dividendHealth) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {aiResult.concentrationRisk && (
                  <div className="border border-amber-500/30 rounded-lg p-3.5 bg-amber-500/10 flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <h4 className="text-amber-300 font-bold text-[13px] mb-0.5">Concentration Risk</h4>
                      <p className="text-[13px] text-slate-200 leading-relaxed">{aiResult.concentrationRisk}</p>
                    </div>
                  </div>
                )}
                {aiResult.dividendHealth && (
                  <div className="border border-cyan-500/30 rounded-lg p-3.5 bg-cyan-500/10 flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">💰</span>
                    <div>
                      <h4 className="text-cyan-300 font-bold text-[13px] mb-0.5">Dividend Health</h4>
                      <p className="text-[13px] text-slate-200 leading-relaxed">{aiResult.dividendHealth}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 📑 LAYER 2: SEGMENTED TABS NAVIGATION                     */}
          {/* ========================================================= */}
          <div className="flex border-b border-[#232738] gap-1 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2.5 rounded-t-lg font-bold text-[13px] transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'plan'
                  ? 'border-amber-400 text-amber-300 bg-[#12141F]'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🎯 แผนปรับพอร์ต (Portfolio Plan)</span>
              {aiResult.idealBlueprint?.length > 0 && (
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-black">
                  {aiResult.idealBlueprint.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('stocks')}
              className={`px-4 py-2.5 rounded-t-lg font-bold text-[13px] transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'stocks'
                  ? 'border-purple-400 text-purple-300 bg-[#12141F]'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🔎 หุ้นรายตัว (Individual Stocks)</span>
              {aiResult.stockVerdicts?.length > 0 && (
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-black">
                  {aiResult.stockVerdicts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('stress')}
              className={`px-4 py-2.5 rounded-t-lg font-bold text-[13px] transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'stress'
                  ? 'border-rose-400 text-rose-300 bg-[#12141F]'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🌪️ จำลองวิกฤต (Stress Test & Risk)</span>
              {aiResult.stressTest?.length > 0 && (
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-black">
                  {aiResult.stressTest.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('macro')}
              className={`px-4 py-2.5 rounded-t-lg font-bold text-[13px] transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'macro'
                  ? 'border-sky-400 text-sky-300 bg-[#12141F]'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🌐 ภาพรวม & สภาพตลาด (Macro & Overview)</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: 🎯 แผนปรับพอร์ต (Portfolio Plan)                     */}
          {/* ========================================================= */}
          {activeTab === 'plan' && (
            <div className="space-y-6 animate-fade-in">
              {/* Before vs After Donut Comparison */}
              {aiResult.idealBlueprint && aiResult.idealBlueprint.length > 0 && (
                <BeforeAfterDonut items={aiResult.idealBlueprint} />
              )}

              {/* Ideal Blueprint Allocation Table */}
              {aiResult.idealBlueprint && aiResult.idealBlueprint.length > 0 && (
                <div className="border border-amber-500/30 rounded-xl p-4 md:p-5 bg-[#12141F] shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                    <div>
                      <h4 className="text-amber-400 font-bold text-sm flex items-center gap-2">
                        <span className="text-base">🎯</span> ตารางพิมพ์เขียวเป้าหมายเชิงกลยุทธ์ (Ideal Blueprint)
                      </h4>
                      <p className="text-[13px] text-slate-300 mt-0.5">
                        เปรียบเทียบสัดส่วนเป้าหมายปัจจุบันกับสัดส่วนในอุดมคติที่ AI Strategist แนะนำเพื่อปรับสมดุล
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => setIsConfirmModalOpen(true)}
                        disabled={isApplying}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[13px] font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-1.5 cursor-pointer"
                        title="คลิกเพื่อนำสัดส่วนเป้าหมายที่ AI แนะนำไปปรับใช้กับ Blueprint ทันที"
                      >
                        <span>⚡</span> ปรับใช้สัดส่วนนี้ (Apply)
                      </button>

                      {previousBlueprintBackup && (
                        <button
                          onClick={handleUndoAllocation}
                          disabled={isApplying}
                          className="px-3 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-500/50 text-[13px] font-bold transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] flex items-center gap-1.5 cursor-pointer"
                          title="กู้คืนสัดส่วน Blueprint เดิมก่อนปรับใช้"
                        >
                          <span>↩️</span> ย้อนกลับสัดส่วนเดิม (Undo)
                        </button>
                      )}

                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-300/80 border border-amber-500/20">
                        OPTIMIZED ALLOCATION
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#232738] text-[13px] text-slate-300">
                          <th className="py-2.5 px-3 font-semibold">สินทรัพย์</th>
                          <th className="py-2.5 px-3 font-semibold">บทบาทเชิงกลยุทธ์</th>
                          <th className="py-2.5 px-3 font-semibold text-right">ปัจจุบัน</th>
                          <th className="py-2.5 px-3 font-semibold text-right">แนะนำ</th>
                          <th className="py-2.5 px-3 font-semibold text-center">การเปลี่ยนผ่าน</th>
                          <th className="py-2.5 px-3 font-semibold text-center">ส่วนต่าง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#232738]/60">
                        {aiResult.idealBlueprint.map((item: any, idx: number) => {
                          const change = Number(item.change ?? (item.idealPercent - item.currentPercent));
                          const isNew = (item.currentPercent || 0) === 0 && item.idealPercent > 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-[14px]">{item.symbol}</span>
                                  {isNew && (
                                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                      ✨ NEW
                                    </span>
                                  )}
                                </div>
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
                              {/* Visual Shift Bar */}
                              <td className="py-3 px-3">
                                <div className="w-24 mx-auto bg-slate-800/80 rounded-full h-2 overflow-hidden flex">
                                  <div
                                    style={{ width: `${Math.min(100, item.currentPercent * 2)}%` }}
                                    className="bg-slate-500 h-full"
                                    title={`ปัจจุบัน: ${item.currentPercent}%`}
                                  />
                                  <div
                                    style={{ width: `${Math.min(100, Math.abs(change) * 2)}%` }}
                                    className={`h-full ${change > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                    title={`ปรับเปลี่ยน: ${change > 0 ? `+${change}%` : `${change}%`}`}
                                  />
                                </div>
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

              {/* Strategic Action Roadmap Stepper */}
              {aiResult.actionRoadmap && aiResult.actionRoadmap.length > 0 && (
                <TimelineStepper roadmap={aiResult.actionRoadmap} />
              )}

              {/* Actionable Suggestions */}
              {aiResult.suggestions && aiResult.suggestions.length > 0 && (
                <div>
                  <h4 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                    <span>🔧</span> คำแนะนำปรับสัดส่วนเพิ่มเติม (Actionable Suggestions)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiResult.suggestions.map((s: any, i: number) => (
                      <div key={i} className="border border-[#232738] bg-[#12141F] rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
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
                          className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-[13px] font-bold transition-colors border border-emerald-500/30 cursor-pointer"
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

          {/* ========================================================= */}
          {/* TAB 2: 🔎 หุ้นรายตัว (Individual Stocks)                   */}
          {/* ========================================================= */}
          {activeTab === 'stocks' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div>
                  <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <span className="text-base">🔎</span> เจาะลึกรายตัว (Forward-Looking Stock Verdicts)
                  </h4>
                  <p className="text-[13px] text-slate-300 mt-0.5">
                    ประเมินคุณภาพหุ้นรายตัวพร้อมเป้าหมายราคา Wall Street Consensus, EPS Growth และ Earnings Beat Streak
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 self-start sm:self-auto">
                  {aiResult.stockVerdicts?.length || 0} รายการ
                </span>
              </div>

              {aiResult.stockVerdicts && aiResult.stockVerdicts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResult.stockVerdicts.map((v: any, idx: number) => {
                    const upperSym = v.symbol?.toUpperCase();
                    const funData = fundamentals[upperSym] || fundamentals[v.symbol];
                    return (
                      <StockVerdictCard
                        key={idx}
                        verdict={v}
                        fundamentals={funData}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#12141F] border border-[#232738] rounded-xl text-slate-300 text-[13px]">
                  ไม่มีข้อมูลการวิเคราะห์หุ้นรายตัว (โหมด Quick Scan จะเน้นภาพรวม กรุณาเลือกโหมด Deep หรือ Strategist เพื่อดูข้อมูลเจาะลึก)
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: 🌪️ จำลองวิกฤต (Stress Test & Risk)                  */}
          {/* ========================================================= */}
          {activeTab === 'stress' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stress Test Scenarios */}
              {aiResult.stressTest && aiResult.stressTest.length > 0 ? (
                <div className="border border-rose-900/30 rounded-xl p-4 md:p-5 bg-gradient-to-b from-rose-950/20 via-[#12141F] to-[#12141F] shadow-lg space-y-4">
                  <div>
                    <h4 className="text-rose-400 font-bold text-sm flex items-center gap-2">
                      <span className="text-base">🌪️</span> Portfolio Stress Test (สถานการณ์จำลองวิกฤต)
                    </h4>
                    <p className="text-[13px] text-slate-300 mt-0.5">
                      ประเมินความทนทานต่อสภาวะตลาดช็อกและระดับ Drawdown ที่อาจเกิดขึ้นกับพอร์ต
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiResult.stressTest.map((test: any, i: number) => (
                      <DrawdownMeter
                        key={i}
                        scenario={test.scenario}
                        estDrawdown={test.estDrawdown}
                        impact={test.impact}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-[#12141F] border border-[#232738] rounded-xl text-slate-300 text-[13px]">
                  โหมดนี้ยังไม่มีการจำลอง Stress Test (มีเฉพาะในโหมด Full Strategist)
                </div>
              )}

              {/* Risk Gauge & Sector Gap Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-700/80 rounded-xl p-4 bg-[#12141F] shadow-md">
                  <RiskGauge score={aiResult.riskScore || 50} beta={weightedBeta} />
                </div>
                <div className="border border-slate-700/80 rounded-xl p-4 bg-[#12141F] overflow-x-auto shadow-md">
                  <SectorGapChart portfolioSectors={portfolioSectors} />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: 🌐 ภาพรวม & สภาพตลาด (Macro & Overview)             */}
          {/* ========================================================= */}
          {activeTab === 'macro' && (
            <div className="space-y-6 animate-fade-in">
              {/* Macro Analysis */}
              {aiResult.macroAnalysis && (
                <div className="border border-purple-500/30 rounded-xl p-5 bg-gradient-to-r from-purple-950/25 via-[#181B2A] to-blue-950/20 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 gap-2">
                    <h4 className="text-purple-300 font-bold text-sm flex items-center gap-2">
                      <span className="text-base">🌐</span> การวิเคราะห์ภาพรวมเศรษฐกิจและธีมตลาด (Macro & Market Context)
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 self-start sm:self-auto">
                      CHIEF STRATEGIST PERSPECTIVE
                    </span>
                  </div>
                  <p className="text-[14px] text-slate-200 leading-relaxed font-normal">
                    {aiResult.macroAnalysis}
                  </p>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-emerald-500/30 rounded-xl p-4 bg-emerald-500/5 shadow-md">
                  <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm">
                    💪 จุดแข็ง (Strengths)
                  </h4>
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

                <div className="border border-rose-500/30 rounded-xl p-4 bg-rose-500/5 shadow-md">
                  <h4 className="text-rose-400 font-bold mb-3 flex items-center gap-2 text-sm">
                    ⚠️ จุดเสี่ยงที่ควรระวัง (Weaknesses)
                  </h4>
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

              {/* Missing Exposure */}
              {aiResult.missingExposure && aiResult.missingExposure.length > 0 && (
                <div className="border border-[#232738] bg-[#12141F] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
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
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Applying Ideal Blueprint */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181B2A] border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_30px_rgba(245,158,11,0.25)] text-white relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                🎯
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ยืนยันการปรับสัดส่วน Blueprint ตามคำแนะนำ
                </h3>
                <p className="text-[13px] text-slate-300">
                  AI Strategist Optimized Allocation
                </p>
              </div>
            </div>

            <p className="text-[13px] text-slate-200 leading-relaxed mb-3">
              ระบบจะอัปเดตสัดส่วนเป้าหมาย (Target %) ของสินทรัพย์ทั้งหมด {aiResult.idealBlueprint?.length || 0} รายการให้ตรงตามพิมพ์เขียวแนะนำในตารางทันที
            </p>

            <div className="bg-[#12141F] border border-[#232738] rounded-xl p-3 mb-4 max-h-48 overflow-y-auto divide-y divide-[#232738]/60">
              {aiResult.idealBlueprint?.map((item: any, idx: number) => {
                const change = Number(item.change ?? (item.idealPercent - item.currentPercent));
                return (
                  <div key={idx} className="flex justify-between items-center py-1.5 px-2 text-[13px]">
                    <div className="font-semibold text-white">{item.symbol}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{item.currentPercent}%</span>
                      <span className="text-slate-500">➔</span>
                      <span className="font-bold text-amber-300">{item.idealPercent}%</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                        change > 0 ? 'bg-emerald-500/20 text-emerald-300' :
                        change < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {change > 0 ? `+${change}%` : `${change}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[13px] text-blue-200 flex items-center gap-2 mb-6">
              <span>💡</span>
              <span>ระบบจะบันทึก Snapshot สัดส่วนเดิมไว้ให้อัตโนมัติ สามารถกดย้อนกลับ (Undo) ได้ทุกเมื่อ</span>
            </div>

            <div className="flex justify-end items-center gap-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isApplying}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[13px] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApplyIdealBlueprint}
                disabled={isApplying}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-lg text-[13px] transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer"
              >
                {isApplying ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>กำลังปรับสัดส่วน...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>ยืนยันการปรับสัดส่วน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast Banner */}
      {applySuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#181B2A] border border-emerald-500/40 rounded-xl p-4 shadow-[0_0_25px_rgba(52,211,153,0.3)] text-white flex items-center gap-3 animate-fade-in max-w-md">
          <span className="text-xl">🎉</span>
          <div className="text-[13px] text-slate-200 font-medium flex-1">
            {applySuccessMessage}
          </div>
          {previousBlueprintBackup && (
            <button
              onClick={handleUndoAllocation}
              className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>↩️</span> Undo
            </button>
          )}
          <button
            onClick={() => setApplySuccessMessage(null)}
            className="text-slate-400 hover:text-white text-sm shrink-0 ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
