export interface TranscriptionModel {
  id: string;
  name: string;
}

export const OPENAI_MODELS: TranscriptionModel[] = [
  { id: "whisper-1", name: "Whisper 1" },
];

export const OPENAI_CHAT_MODELS: TranscriptionModel[] = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini (แนะนำ)" },
  { id: "gpt-4o", name: "GPT-4o" },
];

// Google AI Studio / Gemini multimodal models used as STT via generateContent + audio.
// First entry is the app default when switching the Settings provider to Gemini.
export const GEMINI_MODELS: TranscriptionModel[] = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (แนะนำ)" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
];

export const GEMINI_CHAT_MODELS: TranscriptionModel[] = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (แนะนำ)" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
];

// OpenRouter's /api/v1/models?output_modalities=transcription list, as of the last check.
// First entry is the app default when switching the Settings provider to OpenRouter.
export const OPENROUTER_MODELS: TranscriptionModel[] = [
  {
    id: "openai/whisper-large-v3-turbo",
    name: "OpenAI — Whisper Large V3 Turbo (แนะนำ)",
  },
  { id: "openai/whisper-large-v3", name: "OpenAI — Whisper Large V3" },
  { id: "openai/whisper-1", name: "OpenAI — Whisper 1" },
  {
    id: "openai/gpt-4o-mini-transcribe",
    name: "OpenAI — GPT-4o Mini Transcribe",
  },
  { id: "openai/gpt-4o-transcribe", name: "OpenAI — GPT-4o Transcribe" },
  { id: "deepgram/nova-3", name: "Deepgram — Nova-3" },
  { id: "google/chirp-3", name: "Google — Chirp 3" },
  {
    id: "mistralai/voxtral-mini-transcribe",
    name: "Mistral — Voxtral Mini Transcribe",
  },
  { id: "nvidia/parakeet-tdt-0.6b-v3", name: "NVIDIA — Parakeet TDT 0.6B v3" },
  { id: "qwen/qwen3-asr-flash-2026-02-10", name: "Qwen — Qwen3 ASR Flash" },
  {
    id: "microsoft/mai-transcribe-1.5",
    name: "Microsoft — MAI-Transcribe 1.5",
  },
  { id: "x-ai/grok-stt-1.0", name: "xAI — Grok STT 1.0" },
];

export const OPENROUTER_CHAT_MODELS: TranscriptionModel[] = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (แนะนำ)" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
];



export const GROQ_MODELS: TranscriptionModel[] = [
  { id: "whisper-large-v3-turbo", name: "Whisper Large V3 Turbo (แนะนำ)" },
  { id: "whisper-large-v3", name: "Whisper Large V3" },
  { id: "distil-whisper-large-v3-en", name: "Distil Whisper (English only)" },
];

export const GROQ_CHAT_MODELS: TranscriptionModel[] = [
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (ฉลาดสุด)" },
  { id: "qwen/qwen3.6-27b", name: "Qwen 3.6 27B (เก่งไทย & เร็ว)" },
  { id: "groq/compound", name: "Groq Compound" },
  { id: "groq/compound-mini", name: "Groq Compound Mini" },
];
