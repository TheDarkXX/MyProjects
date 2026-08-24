import { icons } from "../icons";
import { BTN_PRIMARY, PAGE_TITLE, EMPTY_STATE } from "../uiClasses";
import { escapeHtml } from "../utils";

export async function mountDictionary(root: HTMLElement) {
  let words = await window.typeless.listDictionary();
  let corrections = await window.typeless.listCorrections();
  let logs = await window.typeless.listAutoTuneLogs();

  let activeTab: "dictionary" | "corrections" | "logs" = "dictionary";

  async function render() {
    words = await window.typeless.listDictionary();
    corrections = await window.typeless.listCorrections();
    logs = await window.typeless.listAutoTuneLogs();

    const tabClass = (tab: string) => 
      activeTab === tab 
        ? "border-ruby-red text-ruby-red" 
        : "border-transparent text-neutral-400 hover:text-neutral-200 hover:border-white/20";

    root.innerHTML = `
      <div class="mb-6 flex items-center justify-between">
        <h1 class="${PAGE_TITLE} mb-0">AI Knowledge Base</h1>
        <button id="auto-tune-btn" class="flex items-center gap-2 rounded-xl bg-ruby-red/10 border border-ruby-red/20 px-4 py-2 text-[13px] font-bold text-ruby-red transition-all hover:bg-ruby-red/20 hover:border-ruby-red/40 hover:shadow-[0_0_15px_rgba(244, 63, 94,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby-red/50">
          ${icons.zap} Auto-Tune
        </button>
      </div>
      
      <div id="auto-tune-status" class="mb-6 hidden rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-[13px] font-medium text-indigo-300 backdrop-blur-sm"></div>

      <!-- Tabs -->
      <div class="mb-6 flex gap-6 border-b border-white/10 px-1">
        <button data-tab="dictionary" class="border-b-2 pb-3 pt-1 text-[13.5px] font-semibold transition-colors ${tabClass("dictionary")}">System Dictionary</button>
        <button data-tab="corrections" class="border-b-2 pb-3 pt-1 text-[13.5px] font-semibold transition-colors ${tabClass("corrections")}">Custom Corrections</button>
        <button data-tab="logs" class="border-b-2 pb-3 pt-1 text-[13.5px] font-semibold transition-colors ${tabClass("logs")}">Auto-Tune Logs</button>
      </div>

      <div class="rounded-[1.25rem] border border-white/5 bg-white/[0.02] p-6">
        ${activeTab === "dictionary" ? `
          <h2 class="mb-2 text-[15px] font-bold text-white">System Dictionary</h2>
          <p class="mb-6 text-[13px] leading-relaxed text-neutral-400">คำในนี้ใช้เป็นใบ้ให้ Whisper โน้มเอียงมาใช้คำเหล่านี้ (เช่น ชื่อเฉพาะ ศัพท์เทคนิค) — ไม่การันตีว่าจะออกตรงทุกครั้ง ถ้ายังผิดซ้ำ ให้ใช้ Custom Corrections แทน</p>
          
          <div class="mb-6 flex gap-3">
            <label for="dict-input" class="sr-only">เพิ่มคำในพจนานุกรม</label>
            <input id="dict-input" type="text" placeholder="พิมพ์คำเฉพาะที่ต้องการ แล้วกด Enter..." class="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[13.5px] text-white outline-none transition-all hover:border-white/20 focus-visible:border-ruby-red/50 focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-ruby-red/20" />
            <button id="add-btn" class="${BTN_PRIMARY} px-5 rounded-xl font-bold">${icons.plus}<span>Add</span></button>
          </div>
          
          <div class="flex flex-wrap gap-2.5" id="dict-chips">
            ${words.length === 0 ? `<div class="${EMPTY_STATE} w-full py-10 border border-dashed border-white/10 rounded-xl bg-transparent">ยังไม่มีคำในพจนานุกรม</div>` : words.map((w) => `
              <span class="group flex items-center gap-2 rounded-full border border-ruby-red/20 bg-ruby-red/10 py-1.5 pl-3.5 pr-1.5 text-[13px] text-ruby-red font-medium transition-all hover:border-ruby-red/40 hover:bg-ruby-red/20">
                ${escapeHtml(w)}
                <button data-word="${escapeHtml(w)}" aria-label="ลบคำ ${escapeHtml(w)}" class="flex h-5 w-5 items-center justify-center rounded-full bg-ruby-red/20 text-ruby-red transition-colors [&_svg]:h-[11px] [&_svg]:w-[11px] hover:bg-ruby-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby-red/50">${icons.x}</button>
              </span>
            `).join("")}
          </div>
        ` : activeTab === "corrections" ? `
          <h2 class="mb-2 text-[15px] font-bold text-white">Custom Corrections</h2>
          <p class="mb-6 text-[13px] leading-relaxed text-neutral-400">แทนที่ข้อความที่มักถูกถอดเสียงผิดแบบตายตัว (เช่น Whisper ออก "บอก" ให้แก้เป็น "or") — ช่องซ้ายต้องพิมพ์ให้ตรงกับที่ Whisper ถอดออกมาผิดเป๊ะๆ</p>
          
          <div class="mb-6 flex items-center gap-3">
            <input id="corr-from-input" type="text" placeholder="คำที่มักถอดผิด (จาก History)" class="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[13.5px] text-white outline-none transition-all hover:border-white/20 focus-visible:border-ruby-red/50 focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-ruby-red/20" />
            <span class="text-neutral-500 [&_svg]:h-4 [&_svg]:w-4">${icons.arrowRight || "→"}</span>
            <input id="corr-to-input" type="text" placeholder="คำที่ถูกต้อง" class="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[13.5px] text-white outline-none transition-all hover:border-white/20 focus-visible:border-ruby-red/50 focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-ruby-red/20" />
            <button id="add-corr-btn" class="${BTN_PRIMARY} px-5 rounded-xl font-bold">${icons.plus}<span>Add</span></button>
          </div>
          
          <div class="flex flex-col gap-2.5" id="corr-list">
            ${corrections.length === 0 ? `<div class="${EMPTY_STATE} w-full py-10 border border-dashed border-white/10 rounded-xl bg-transparent">ยังไม่มี correction rule</div>` : corrections.map((c, i) => `
              <div class="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/10 hover:bg-white/[0.06]">
                <div class="min-w-0 flex-1 truncate text-[13.5px] text-neutral-300 font-medium">${escapeHtml(c.from)}</div>
                <span class="text-neutral-500 [&_svg]:h-4 [&_svg]:w-4">${icons.arrowRight || "→"}</span>
                <div class="min-w-0 flex-1 truncate text-[13.5px] font-bold text-hot-pink">${escapeHtml(c.to)}</div>
                <button data-index="${i}" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-neutral-400 opacity-0 transition-all [&_svg]:h-3.5 [&_svg]:w-3.5 group-hover:opacity-100 hover:bg-white/15 hover:text-white">${icons.trash || icons.x}</button>
              </div>
            `).join("")}
          </div>
        ` : `
          <h2 class="mb-2 text-[15px] font-bold text-white">Auto-Tune Logs</h2>
          <p class="mb-6 text-[13px] leading-relaxed text-neutral-400">ประวัติการทำงานของ AI Auto-Tune ที่ช่วยวิเคราะห์และสร้างกฎให้โดยอัตโนมัติจากประวัติการอัดเสียง</p>
          
          <div class="flex flex-col gap-3" id="tune-log">
            ${logs.length === 0 ? `<div class="${EMPTY_STATE} w-full py-10 border border-dashed border-white/10 rounded-xl bg-transparent">ยังไม่มี log การทำงาน</div>` : logs.slice(0, 15).map((log) => `
              <div class="rounded-xl border ${log.error ? 'border-red-900/30 bg-red-950/10' : 'border-white/5 bg-white/[0.02]'} px-4 py-3.5">
                <div class="mb-2 flex items-center gap-3 text-neutral-400">
                  <span class="text-[11.5px] font-mono tracking-wide">${new Date(log.timestamp).toLocaleString("th-TH")}</span>
                  <span class="rounded-full ${log.trigger === 'auto' ? 'bg-ruby-red/15 text-ruby-red border-ruby-red/30' : 'bg-burnt-orange/15 text-burnt-orange border-burnt-orange/30'} px-2.5 py-0.5 text-[10px] font-bold border tracking-wider uppercase">${log.trigger === 'auto' ? 'Auto' : 'Manual'}</span>
                  <span class="ml-auto text-[11.5px] font-medium text-neutral-500">${log.entriesAnalyzed} entries</span>
                </div>
                ${log.error
                  ? `<div class="text-[13px] text-red-400 mt-1">${icons.alert || '❌'} ${escapeHtml(log.error)}</div>`
                  : `<div class="text-[13.5px] font-medium text-neutral-200 mt-1"><span class="text-hot-pink">+${log.correctionsAdded}</span> corrections, <span class="text-ruby-red">+${log.wordsAdded}</span> dictionary words</div>`
                }
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;

    // Tab Switching
    root.querySelectorAll<HTMLButtonElement>("button[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab as any;
        render();
      });
    });

    // Sub-components events based on active tab
    if (activeTab === "dictionary") {
      const input = document.getElementById("dict-input") as HTMLInputElement;
      const addBtn = document.getElementById("add-btn")!;

      async function addWord() {
        const value = input.value.trim();
        if (!value) return;
        words = await window.typeless.setDictionary([...words, value]);
        input.value = "";
        render();
      }

      addBtn.addEventListener("click", addWord);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") addWord();
      });

      document.getElementById("dict-chips")!.addEventListener("click", async (e) => {
        const btn = (e.target as HTMLElement).closest("button[data-word]") as HTMLButtonElement | null;
        if (!btn) return;
        words = await window.typeless.setDictionary(words.filter((w) => w !== btn.dataset.word));
        render();
      });
    } else if (activeTab === "corrections") {
      const fromInput = document.getElementById("corr-from-input") as HTMLInputElement;
      const toInput = document.getElementById("corr-to-input") as HTMLInputElement;
      const addCorrBtn = document.getElementById("add-corr-btn")!;

      async function addCorrection() {
        const from = fromInput.value.trim();
        const to = toInput.value.trim();
        if (!from || !to) return;
        corrections = await window.typeless.setCorrections([...corrections, { from, to }]);
        fromInput.value = "";
        toInput.value = "";
        render();
      }

      addCorrBtn.addEventListener("click", addCorrection);
      [fromInput, toInput].forEach((el) =>
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter") addCorrection();
        }),
      );

      document.getElementById("corr-list")!.addEventListener("click", async (e) => {
        const btn = (e.target as HTMLElement).closest("button[data-index]") as HTMLButtonElement | null;
        if (!btn) return;
        const index = Number(btn.dataset.index);
        corrections = await window.typeless.setCorrections(corrections.filter((_, i) => i !== index));
        render();
      });
    }

    const autoTuneBtn = document.getElementById("auto-tune-btn") as HTMLButtonElement;
    const statusDiv = document.getElementById("auto-tune-status")!;
    if (autoTuneBtn) {
      autoTuneBtn.addEventListener("click", async () => {
        autoTuneBtn.innerHTML = `${icons.clock} กำลังวิเคราะห์...`;
        autoTuneBtn.disabled = true;
        autoTuneBtn.classList.add("opacity-60", "cursor-wait");
        statusDiv.classList.add("hidden");
        try {
          const result = await window.typeless.runAutoTune();
          statusDiv.innerHTML = `${icons.check} เสร็จแล้ว! เพิ่ม ${result.correctionsAdded} correction rules, ${result.wordsAdded} dictionary words`;
          statusDiv.classList.remove("hidden");
          await render();
        } catch (err) {
          console.error(err);
          statusDiv.innerHTML = `${icons.alert} เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : String(err)}`;
          statusDiv.classList.remove("hidden");
          statusDiv.classList.replace("border-indigo-500/30", "border-red-500/30");
          statusDiv.classList.replace("bg-indigo-500/10", "bg-red-500/10");
          statusDiv.classList.replace("text-indigo-300", "text-red-300");
        }
      });
    }
  }

  await render();
}

