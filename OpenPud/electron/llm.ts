import type { AppSettings } from './config';
import { geminiChatComplete, isGeminiProvider } from './gemini';

export class LlmError extends Error {}

// Shared chat-completion call used by AI polish and Translate —
// both need "system prompt + user text -> completion text" against
// whatever provider the user already configured for STT.
export async function chatComplete(
  settings: AppSettings,
  systemPrompt: string,
  userText: string,
  modelOverride?: string,
): Promise<string> {
  if (!settings.apiKey) {
    throw new LlmError('ยังไม่ได้ตั้งค่า API key ในหน้า Settings');
  }

  if (isGeminiProvider(settings)) {
    try {
      return await geminiChatComplete(settings, systemPrompt, userText);
    } catch (err) {
      throw new LlmError(err instanceof Error ? err.message : String(err));
    }
  }

  const res = await fetch(`${settings.apiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelOverride || settings.chatModel || 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new LlmError(`Chat completion API error (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export interface AutoTuneResults {
  corrections: { wrong: string; correct: string }[];
  dictionary: string[];
}

export async function extractAutoTuneResults(
  settings: AppSettings,
  historyTexts: string[],
): Promise<AutoTuneResults> {
  const systemPrompt = `
You are an expert Thai linguist and AI assistant.
Your task is to analyze transcribed texts from an STT engine (Whisper) used by a Thai speaker.
Sometimes the STT engine mishears words phonetically or spells English words weirdly in Thai.

Analyze the given transcriptions and produce TWO things:

1. "corrections": Words/phrases that were clearly misheard or spelled phonetically by the STT engine.
   Each item has "wrong" (exact text as it appears) and "correct" (what it should be).

2. "dictionary": Specialized terms, brand names, tech jargon, or proper nouns that appear in the text
   and should be added to a dictionary so the STT engine recognizes them in the future.
   Only include words that are NOT common everyday Thai words.

Rules:
- Output ONLY a raw JSON object. Do NOT use markdown code blocks.
- ONLY include highly confident items.
- If no corrections or dictionary words found, return empty arrays.

Example output:
{"corrections": [{"wrong": "กล็อก", "correct": "Groq"}], "dictionary": ["Groq", "Whisper", "Electron"]}
  `.trim();

  const userText = historyTexts.map((t, i) => `[${i + 1}] ${t}`).join('\n');
  const response = await chatComplete(settings, systemPrompt, userText, settings.autoTuneModel);

  try {
    let jsonStr = response;
    // Strip markdown code blocks if the LLM ignores instructions
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }
    const parsed = JSON.parse(jsonStr);

    const corrections = Array.isArray(parsed.corrections)
      ? parsed.corrections.filter(
          (item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as { wrong?: unknown }).wrong === 'string' &&
            typeof (item as { correct?: unknown }).correct === 'string',
        )
      : [];

    const dictionary = Array.isArray(parsed.dictionary)
      ? parsed.dictionary.filter((w: unknown) => typeof w === 'string' && w.length > 0)
      : [];

    return { corrections, dictionary };
  } catch (err) {
    throw new LlmError(
      `Failed to parse AI response: ${err instanceof Error ? err.message : String(err)}\nRaw Output: ${response}`,
    );
  }
}

