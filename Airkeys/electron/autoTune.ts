import { getSettings } from './config';
import { getUntunedEntries, markAsTuned } from './history';
import { listCorrections, setCorrections, listDictionaryWords, setDictionaryWords } from './dictionary';
import { extractAutoTuneResults } from './llm';
import { addAutoTuneLog } from './autoTuneLog';

let isRunning = false;

/**
 * Check if auto-tune should run and trigger it if threshold is met.
 * Called after each transcription. Non-blocking (fire-and-forget).
 */
export function maybeAutoTune(): void {
  const threshold = getSettings().autoTuneThreshold ?? 10;
  const untunedCount = getUntunedEntries().length;
  if (untunedCount >= threshold && !isRunning) {
    runAutoTune('auto').catch(err => console.error('[AutoTune] Background run failed:', err));
  }
}

/**
 * Core Auto-Tune engine. Analyzes untuned history entries via LLM,
 * extracts corrections + dictionary words, deduplicates, saves, and logs.
 */
export async function runAutoTune(
  trigger: 'auto' | 'manual' = 'manual',
): Promise<{ correctionsAdded: number; wordsAdded: number }> {
  if (isRunning) return { correctionsAdded: 0, wordsAdded: 0 };
  isRunning = true;

  try {
    const settings = getSettings();
    if (!settings.apiKey) {
      throw new Error('No API key configured');
    }

    const untunedEntries = getUntunedEntries();
    if (untunedEntries.length === 0) {
      return { correctionsAdded: 0, wordsAdded: 0 };
    }

    // Take up to 100 entries for analysis
    const entriesToAnalyze = untunedEntries.slice(0, 100);
    const historyTexts = entriesToAnalyze.map(e => e.text);

    const results = await extractAutoTuneResults(settings, historyTexts);

    // --- Corrections: deduplicate against existing ---
    const existingCorrections = listCorrections();
    const existingFroms = new Set(existingCorrections.map(r => r.from.toLowerCase()));
    const newCorrections = results.corrections
      .filter(r => !existingFroms.has(r.wrong.toLowerCase()))
      .map(r => ({ from: r.wrong, to: r.correct }));

    if (newCorrections.length > 0) {
      setCorrections([...existingCorrections, ...newCorrections]);
    }

    // --- Dictionary: deduplicate against existing ---
    const existingWords = listDictionaryWords();
    const existingWordsSet = new Set(existingWords.map(w => w.toLowerCase()));
    const newWords = results.dictionary.filter(w => !existingWordsSet.has(w.toLowerCase()));

    if (newWords.length > 0) {
      setDictionaryWords([...existingWords, ...newWords]);
    }

    // --- Mark entries as tuned ---
    markAsTuned(entriesToAnalyze.map(e => e.id));

    // --- Log ---
    addAutoTuneLog({
      trigger,
      entriesAnalyzed: entriesToAnalyze.length,
      correctionsAdded: newCorrections.length,
      wordsAdded: newWords.length,
      corrections: newCorrections,
      words: newWords,
    });

    console.log(
      `[AutoTune] ${trigger} run complete: +${newCorrections.length} corrections, +${newWords.length} dict words from ${entriesToAnalyze.length} entries`,
    );

    return { correctionsAdded: newCorrections.length, wordsAdded: newWords.length };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[AutoTune] Failed:', errorMsg);

    addAutoTuneLog({
      trigger,
      entriesAnalyzed: 0,
      correctionsAdded: 0,
      wordsAdded: 0,
      corrections: [],
      words: [],
      error: errorMsg,
    });

    return { correctionsAdded: 0, wordsAdded: 0 };
  } finally {
    isRunning = false;
  }
}
