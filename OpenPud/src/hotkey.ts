import { BTN, BTN_PRIMARY } from "./uiClasses";

export function renderHotkeyBadges(hotkey: string): string {
  return hotkey
    .split("+")
    .map(
      (k) =>
        `<span class="rounded-[6px] border border-white/20 bg-gradient-to-b from-white/10 to-white/5 px-2.5 py-[5px] text-[11px] font-bold text-neutral-300 shadow-[0_2px_0_rgba(255,255,255,0.1)] tracking-wide uppercase">${k.trim()}</span>`,
    )
    .join('<span class="text-[11px] font-bold text-neutral-300 self-center">+</span>');
}

const MODIFIER_KEYS = ["Control", "Alt", "Shift", "Meta"];

export function acceleratorFromEvent(e: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.includes(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Control");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Super");
  parts.push(acceleratorKeyFromCode(e.code, e.key));
  return parts.join("+");
}

function acceleratorKeyFromCode(code: string, key: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return code.slice(5);
  if (/^F\d{1,2}$/.test(code)) return code;
  if (code === "Space") return "Space";
  if (code === "Enter") return "Return";
  return key.length === 1 ? key.toUpperCase() : key;
}

export function openHotkeyModal(
  modeName: string,
  currentHotkey: string,
  onSaved: (hotkey: string) => void | Promise<void>,
) {
  let value = currentHotkey;

  const overlay = document.createElement("div");
  overlay.className =
    "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm";
  overlay.innerHTML = `
    <div class="w-[380px] rounded-2xl bg-neutral-900 border border-white/10 p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="ตั้งค่าคีย์ลัด ${modeName}">
      <h3 class="mb-1 text-[16px] font-bold text-white">คีย์ลัด ${modeName}</h3>
      <p class="mb-4 text-[13px] text-neutral-200">กดปุ่มบนคีย์บอร์ดที่ต้องการตั้งเป็นคีย์ลัดสำหรับเริ่ม/หยุดอัดเสียง</p>
      <div id="modal-hotkey-badges" class="mb-5 flex min-h-[50px] flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-black/50 px-3 py-3 shadow-inner">${renderHotkeyBadges(value)}</div>
      <div class="flex justify-end gap-2">
        <button id="modal-cancel-btn" type="button" class="${BTN}">ยกเลิก</button>
        <button id="modal-record-btn" type="button" class="${BTN}">เปลี่ยนคีย์</button>
        <button id="modal-save-btn" type="button" class="${BTN_PRIMARY}">บันทึก</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const badgesEl = overlay.querySelector("#modal-hotkey-badges")!;
  const recordBtn = overlay.querySelector(
    "#modal-record-btn",
  ) as HTMLButtonElement;
  const saveBtn = overlay.querySelector(
    "#modal-save-btn",
  ) as HTMLButtonElement;
  const cancelBtn = overlay.querySelector(
    "#modal-cancel-btn",
  ) as HTMLButtonElement;

  function close() {
    document.removeEventListener("keydown", onModalKeydown, true);
    overlay.remove();
  }

  function onModalKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onModalKeydown, true);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  cancelBtn.addEventListener("click", close);

  recordBtn.addEventListener("click", () => {
    document.removeEventListener("keydown", onModalKeydown, true);
    recordBtn.disabled = true;
    recordBtn.textContent = "รอรับค่า...";
    badgesEl.innerHTML = `<span class="text-xs font-semibold text-coral animate-pulse">กดปุ่มบนคีย์บอร์ดเลย (Esc ยกเลิก)</span>`;

    const onRecordKeydown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        finishRecording(value);
        return;
      }
      const accelerator = acceleratorFromEvent(e);
      if (!accelerator || !accelerator.includes("+")) return;
      finishRecording(accelerator);
    };

    function finishRecording(accelerator: string) {
      document.removeEventListener("keydown", onRecordKeydown, true);
      value = accelerator;
      badgesEl.innerHTML = renderHotkeyBadges(accelerator);
      recordBtn.disabled = false;
      recordBtn.textContent = "เปลี่ยนคีย์";
      document.addEventListener("keydown", onModalKeydown, true);
    }

    document.addEventListener("keydown", onRecordKeydown, true);
  });

  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "กำลังบันทึก…";
    try {
      await onSaved(value);
      close();
    } catch {
      saveBtn.disabled = false;
      saveBtn.textContent = "บันทึก";
    }
  });
}
