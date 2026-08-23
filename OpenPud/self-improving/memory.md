# AirKeys - Self-Improving Memory

## Architectural Principles
1. **Context Isolation First:** Always maintain strict separation between main and renderer. IPC only via `window.typeless`.
2. **Minimal External Dependencies:** Avoid native C++ Node modules (like `iohook`) to keep builds simple, unless absolutely necessary.
3. **UX Focus:** The widget must remain visually unobtrusive (transparent, non-focusable, always on top).

## AI Workflow
- STT default: `openai/whisper-large-v3-turbo` (via OpenRouter)
- Chat default: `google/gemini-2.5-flash` (via OpenRouter)
