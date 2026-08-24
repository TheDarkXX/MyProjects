import { icons } from "../icons";
import { BTN, PAGE_TITLE, EMPTY_STATE } from "../uiClasses";
import { escapeHtml } from "../utils";

export async function mountHistory(root: HTMLElement) {
  let entries = await window.typeless.listHistory();
  let searchQuery = "";

  function render() {
    const filtered = entries.filter((e) =>
      e.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    root.innerHTML = `
      <div class="mb-8 flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <h1 class="${PAGE_TITLE}">History</h1>
          <button id="clear-btn" class="${BTN}">${icons.trash}<span>ล้างประวัติ</span></button>
        </div>
        <div class="relative">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500 [&_svg]:h-4 [&_svg]:w-4">
            ${icons.search || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'}
          </div>
          <input type="text" id="search-input" value="${escapeHtml(searchQuery)}" placeholder="ค้นหาประวัติ..." class="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-[13px] text-white placeholder-neutral-500 outline-none transition-all hover:bg-white/10 focus:border-ruby-red/50 focus:bg-white/10 focus:ring-2 focus:ring-ruby-red/20" />
        </div>
      </div>
      
      <div class="relative pl-6">
        ${
          filtered.length === 0
            ? `<div class="${EMPTY_STATE}">${searchQuery ? 'ไม่พบประวัติที่ค้นหา' : 'ยังไม่มีประวัติการอัดเสียง'}</div>`
            : `<!-- Timeline Line -->
               <div class="absolute left-6 top-3 bottom-0 w-px bg-gradient-to-b from-white/15 via-white/5 to-transparent"></div>
               <div class="flex flex-col gap-5">` + 
               filtered.map(
                  (e) => `
              <div class="relative group">
                <!-- Timeline Dot -->
                <div class="absolute -left-[29px] top-4 h-2.5 w-2.5 rounded-full bg-neutral-800 border-2 border-white/20 transition-colors group-hover:border-ruby-red group-hover:bg-ruby-red group-hover:shadow-[0_0_12px_rgba(244, 63, 94,0.8)] z-10"></div>
                
                <div class="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06] hover:border-white/15 hover:shadow-lg hover:shadow-ruby-red/5">
                  <div class="mb-3 flex items-center gap-4 text-xs font-medium text-neutral-400">
                    <span class="flex items-center gap-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5">${icons.clock} ${new Date(e.timestamp).toLocaleString("th-TH", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                    <span class="flex items-center gap-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5">${icons.mic} ${e.wordCount} คำ</span>
                    <span class="flex items-center gap-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5">${icons.zap} ${(e.durationMs / 1000).toFixed(1)}s</span>
                    ${e.autoTuned ? '<span class="inline-flex items-center gap-1.5 rounded-full bg-ruby-red/15 border border-ruby-red/30 px-2.5 py-0.5 text-[10px] font-bold text-ruby-red tracking-wide uppercase">Tuned</span>' : ''}
                    <button class="copy-btn ${BTN} ml-auto px-3 py-1.5 opacity-0 transition-opacity group-hover:opacity-100" data-id="${e.id}">${icons.copy}<span>คัดลอก</span></button>
                    <button class="delete-btn ${BTN} ml-2 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ruby-red hover:border-ruby-red/50 hover:bg-ruby-red/10" data-id="${e.id}" title="ลบรายการนี้">${icons.trash}</button>
                  </div>
                  <div class="text-[13.5px] leading-relaxed text-neutral-200 font-medium">${escapeHtml(e.text) || "<i>(ว่าง)</i>"}</div>
                </div>
              </div>
            `,
                ).join("") + `</div>`
        }
      </div>
    `;

    document
      .getElementById("clear-btn")
      ?.addEventListener("click", async () => {
        if (!confirm("ลบประวัติการอัดเสียงทั้งหมด? ทำย้อนกลับไม่ได้")) return;
        await window.typeless.clearHistory();
        entries = await window.typeless.listHistory();
        render();
      });

    const searchInput = document.getElementById("search-input") as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = (e.target as HTMLInputElement).value;
        render();
        // Restore focus and cursor position after re-render
        const newSearchInput = document.getElementById("search-input") as HTMLInputElement;
        if (newSearchInput) {
          newSearchInput.focus();
          newSearchInput.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    root.querySelectorAll<HTMLButtonElement>(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const entry = entries.find((e) => e.id === btn.dataset.id);
        if (!entry) return;
        await navigator.clipboard.writeText(entry.text);
        btn.innerHTML = `${icons.check}<span>คัดลอกแล้ว</span>`;
        setTimeout(() => {
          btn.innerHTML = `${icons.copy}<span>คัดลอก</span>`;
        }, 1200);
      });
    });

    root.querySelectorAll<HTMLButtonElement>(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
        const id = btn.dataset.id;
        if (id) {
          await window.typeless.deleteHistory(id);
          entries = await window.typeless.listHistory();
          render();
        }
      });
    });
  }

  const cleanup = window.typeless.onHistoryUpdated(async () => {
    entries = await window.typeless.listHistory();
    render();
  });
  
  render();
  return cleanup;
}

