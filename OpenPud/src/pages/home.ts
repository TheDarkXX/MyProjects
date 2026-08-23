import { icons } from "../icons";

const APP_VERSION = '1.1.2';

import { escapeHtml } from "../utils";
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'เมื่อกี้';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

export async function mountHome(root: HTMLElement) {
  const settings = await window.typeless.getSettings();
  const stats = await window.typeless.historyStats();
  const history = await window.typeless.listHistory();
  const recentHistory = history.slice(0, 10); // Show more since we have space

  let providerName = "Custom";
  if (settings.apiBaseUrl.includes("openai.com")) providerName = "OpenAI";
  if (settings.apiBaseUrl.includes("groq.com")) providerName = "Groq";
  if (settings.apiBaseUrl.includes("generativelanguage")) providerName = "Gemini";
  if (settings.apiBaseUrl.includes("openrouter.ai")) providerName = "OpenRouter";

  root.innerHTML = `
    <div class="flex flex-col h-full gap-8">
      
      <!-- Top Hero Banner (Stats) -->
      <div class="relative w-full rounded-[2rem] bg-white/[0.02] backdrop-blur-3xl border border-white/10 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden shrink-0 transition-transform duration-500 hover:scale-[1.005]">
        <!-- Decorative Glows -->
        <div class="absolute -top-32 -left-20 h-64 w-64 rounded-full bg-ruby-red opacity-[0.25] blur-[80px] pointer-events-none"></div>
        <div class="absolute -bottom-32 -right-20 h-64 w-64 rounded-full bg-hot-pink opacity-[0.2] blur-[80px] pointer-events-none"></div>
        
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-8">
            <h1 class="text-2xl font-extrabold tracking-tight text-white">Dashboard</h1>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/10">
                <div class="h-2 w-2 rounded-full bg-burnt-orange shadow-[0_0_8px_rgba(253,85,20,0.6)] animate-pulse"></div>
                <span class="text-[11px] font-mono tracking-widest text-bright-text uppercase">System Ready</span>
              </div>
              <span class="text-[11px] font-bold tracking-wider text-bright-text uppercase bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">v${APP_VERSION}</span>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-6">
            <!-- Stat: Time Saved -->
            <div class="flex flex-col">
              <span class="text-[11px] font-mono tracking-widest text-bright-text uppercase mb-2">Time Saved (Est.)</span>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-mono font-extrabold tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-ruby-red to-hot-pink">${stats.totalMinutes}</span>
                <span class="text-sm font-semibold text-hot-pink">min</span>
              </div>
            </div>
            
            <!-- Stat: Words -->
            <div class="flex flex-col border-l border-white/10 pl-6">
              <span class="flex items-center gap-1.5 text-[11px] font-mono tracking-widest text-bright-text uppercase mb-2 [&_svg]:h-3.5 [&_svg]:w-3.5">${icons.mic} Words spoken</span>
              <span class="text-2xl font-mono font-bold tabular-nums text-white">${stats.totalWords.toLocaleString()}</span>
            </div>

            <!-- Stat: Speed -->
            <div class="flex flex-col border-l border-white/10 pl-6">
              <span class="flex items-center gap-1.5 text-[11px] font-mono tracking-widest text-bright-text uppercase mb-2 [&_svg]:h-3.5 [&_svg]:w-3.5">${icons.zap} Speed</span>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-mono font-bold tabular-nums text-white">${stats.wpm}</span>
                <span class="text-[11px] text-bright-text">WPM</span>
              </div>
            </div>

            <!-- Stat: Provider -->
            <div class="flex flex-col border-l border-white/10 pl-6">
              <span class="flex items-center gap-1.5 text-[11px] font-mono tracking-widest text-bright-text uppercase mb-2 [&_svg]:h-3.5 [&_svg]:w-3.5">${icons.settings} Active Provider</span>
              <span class="text-xl font-bold text-white truncate">${providerName}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Column (Recent Transcripts) -->
      <div class="min-w-0 flex-1 flex flex-col min-h-0">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-white uppercase tracking-wider">Recent Transcripts</h2>
          <a href="#/history" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">ดูทั้งหมด →</a>
        </div>
        
        <div class="flex-1 overflow-y-auto pr-2 pb-8 flex flex-col gap-3 custom-scrollbar">
          ${recentHistory.length === 0 ? `
            <div class="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/5">
              <div class="text-neutral-300 mb-3 [&_svg]:h-8 [&_svg]:w-8">${icons.mic}</div>
              <p class="text-sm text-neutral-200">ยังไม่มีประวัติ ลองกดคีย์ลัดอัดเสียงดูสิ (ตั้งค่าได้ในเมนู Settings)</p>
            </div>
          ` : recentHistory.map((h, i) => `
            <div class="group flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/10 hover:shadow-lg hover:shadow-ruby-red/5" style="animation: fade-in-up ${300 + i * 50}ms ease-out forwards; opacity: 0;">
              <div class="mt-0.5 text-ruby-red [&_svg]:h-4 [&_svg]:w-4">${icons.mic}</div>
              <div class="min-w-0 flex-1">
                <p class="text-[13px] leading-relaxed text-bright-text line-clamp-3">${escapeHtml(h.text)}</p>
                <div class="mt-2.5 flex items-center gap-3 text-[11px] font-medium text-bright-text">
                  <span class="flex items-center gap-1">${icons.clock} ${timeAgo(new Date(h.timestamp).toISOString())}</span>
                  ${h.durationMs ? `<span class="flex items-center gap-1">${icons.zap} ${(h.durationMs / 1000).toFixed(1)}s</span>` : ''}
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
      
    </div>
  `;
}
