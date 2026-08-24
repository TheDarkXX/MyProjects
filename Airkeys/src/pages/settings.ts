import {
  OPENAI_MODELS,
  OPENAI_CHAT_MODELS,
  OPENROUTER_MODELS,
  OPENROUTER_CHAT_MODELS,
  GEMINI_MODELS,
  GEMINI_CHAT_MODELS,
  GROQ_MODELS,
  GROQ_CHAT_MODELS,
  type TranscriptionModel,
} from "../transcriptionModels";
import {
  BTN_PRIMARY,
  PAGE_TITLE,
  FIELD_LABEL,
  FIELD_INPUT,
  FIELD_SELECT,
} from "../uiClasses";
import { renderHotkeyBadges, openHotkeyModal } from "../hotkey";
import type { AppSettings } from "../types";


async function listMicDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((t) => t.stop());
  } catch {
    // Permission denied or no mic — enumerateDevices below will just return unlabeled entries.
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "audioinput");
}

type ProviderKey = "openai" | "openrouter" | "gemini" | "groq" | "custom";

const PROVIDER_PRESETS: Record<
  Exclude<ProviderKey, "custom">,
  { baseUrl: string; models: TranscriptionModel[]; chatModels: TranscriptionModel[]; chatModel: string; autoTuneModel: string }
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    models: OPENAI_MODELS,
    chatModels: OPENAI_CHAT_MODELS,
    chatModel: "gpt-4o-mini",
    autoTuneModel: "gpt-4o",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    models: OPENROUTER_MODELS,
    chatModels: OPENROUTER_CHAT_MODELS,
    chatModel: "google/gemini-2.5-flash",
    autoTuneModel: "google/gemini-2.5-pro",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: GEMINI_MODELS,
    chatModels: GEMINI_CHAT_MODELS,
    chatModel: "gemini-2.5-flash",
    autoTuneModel: "gemini-2.5-pro",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    models: GROQ_MODELS,
    chatModels: GROQ_CHAT_MODELS,
    chatModel: "openai/gpt-oss-120b",
    autoTuneModel: "qwen/qwen3.6-27b",
  },
};

// Keep in sync with TRANSLATE_LANGUAGES in electron/translate.ts.
const TRANSLATE_LANGUAGES: Record<string, string> = {
  en: "อังกฤษ",
  th: "ไทย",
  ja: "ญี่ปุ่น",
  zh: "จีน",
  ko: "เกาหลี",
  fr: "ฝรั่งเศส",
  de: "เยอรมัน",
  es: "สเปน",
  vi: "เวียดนาม",
};

function detectProvider(baseUrl: string): ProviderKey {
  if (baseUrl === PROVIDER_PRESETS.openai.baseUrl) return "openai";
  if (baseUrl === PROVIDER_PRESETS.openrouter.baseUrl) return "openrouter";
  if (baseUrl === PROVIDER_PRESETS.gemini.baseUrl) return "gemini";
  if (baseUrl === PROVIDER_PRESETS.groq.baseUrl) return "groq";
  return "custom";
}

function generateDropdownHtml(
  provider: ProviderKey,
  fieldId: "model" | "chatModel" | "autoTuneModel",
  currentModel: string,
  label: string
): string {
  if (provider === "custom") {
    return `
      <label class="${FIELD_LABEL}">
        ${label}
        <input id="${fieldId}" type="text" value="${currentModel}" placeholder="พิมพ์ชื่อ Model..." class="${FIELD_INPUT}" />
      </label>
    `;
  }
  const models = fieldId === "model" ? PROVIDER_PRESETS[provider].models : PROVIDER_PRESETS[provider].chatModels;
  return `
    <label class="${FIELD_LABEL}">
      ${label}
      <select id="${fieldId}" class="${FIELD_SELECT}">
        ${models
          .map(
            (m) =>
              `<option value="${m.id}" ${m.id === currentModel ? "selected" : ""}>${m.name}</option>`,
          )
          .join("")}
      </select>
    </label>
  `;
}

export async function mountSettings(root: HTMLElement) {
  const current = await window.typeless.getSettings();
  const mics = await listMicDevices();
  let provider = detectProvider(current.apiBaseUrl);

  root.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h1 class="${PAGE_TITLE} mb-0">Settings</h1>
      <div class="flex items-center gap-3">
        <p id="save-msg" class="text-xs"></p>
        <button id="save-btn" class="${BTN_PRIMARY} px-6">บันทึก</button>
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-6 pb-12">
      <!-- Left Column -->
      <div class="flex flex-col gap-6">
        
        <!-- Section: AI Provider -->
        <div class="rounded-[1.25rem] border border-white/5 bg-white/[0.02] p-5">
          <h2 class="mb-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">AI & Provider</h2>
          <label class="${FIELD_LABEL}">
            ผู้ให้บริการ
            <select id="provider-preset" class="${FIELD_SELECT}">
              <option value="openai" ${provider === "openai" ? "selected" : ""}>OpenAI (api.openai.com)</option>
              <option value="openrouter" ${provider === "openrouter" ? "selected" : ""}>OpenRouter (openrouter.ai)</option>
              <option value="gemini" ${provider === "gemini" ? "selected" : ""}>Gemini (Google AI Studio)</option>
              <option value="groq" ${provider === "groq" ? "selected" : ""}>Groq (api.groq.com)</option>
              <option value="custom" ${provider === "custom" ? "selected" : ""}>กำหนดเอง</option>
            </select>
          </label>
          <label class="${FIELD_LABEL}">
            API Key
            <input id="apiKey" type="password" value="${current.apiKey}" placeholder="${provider === "gemini" ? "AIza..." : provider === "groq" ? "gsk_..." : "sk-..."}" class="${FIELD_INPUT}" />
          </label>
          <label class="${FIELD_LABEL}">
            API Base URL
            <input id="apiBaseUrl" type="text" value="${current.apiBaseUrl}" ${provider !== "custom" ? "disabled" : ""} class="${FIELD_INPUT}" />
          </label>
          <div id="model-field">${generateDropdownHtml(provider, "model", current.model, "Model (STT)")}</div>
          <div id="chatModel-field" class="mb-4">${generateDropdownHtml(provider, "chatModel", current.chatModel, "Chat model (AI polish, Translate)")}</div>
          <div id="autoTuneModel-field">${generateDropdownHtml(provider, "autoTuneModel", current.autoTuneModel || current.chatModel, "Auto-Tune model (วิเคราะห์ประวัติ)")}</div>
        </div>

        <!-- Section: Language & Processing -->
        <div class="rounded-[1.25rem] border border-white/5 bg-white/[0.02] p-5">
          <h2 class="mb-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Language & Formatting</h2>
          <label class="${FIELD_LABEL}">
            ภาษา
            <select id="language" class="${FIELD_SELECT}">
              <option value="" ${current.language === "" ? "selected" : ""}>ไทย + อังกฤษ (แนะนำ)</option>
              <option value="th" ${current.language === "th" ? "selected" : ""}>ไทยเท่านั้น</option>
              <option value="en" ${current.language === "en" ? "selected" : ""}>อังกฤษเท่านั้น</option>
            </select>
          </label>
          <p class="-mt-3 mb-4 text-[11px] leading-relaxed text-neutral-500">
            โหมดแนะนำล็อกการรู้จำเป็นภาษาไทย แต่ยังใบ้ให้รองรับคำอังกฤษที่พูดแทรก — ถ้าพูดอังกฤษล้วนให้เลือก "อังกฤษเท่านั้น"
          </p>
          <label class="${FIELD_LABEL}">
            แปลเป็นภาษา (โหมด Translate)
            <select id="translateTargetLang" class="${FIELD_SELECT}">
              ${Object.entries(TRANSLATE_LANGUAGES)
                .map(
                  ([code, name]) =>
                    `<option value="${code}" ${current.translateTargetLang === code ? "selected" : ""}>${name}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label class="mb-2 flex flex-row items-center gap-3 text-[13px] text-neutral-300">
            <input id="stripFillersEnabled" type="checkbox" class="w-auto h-4 w-4 rounded border-white/10 bg-white/5 text-ruby-red focus:ring-ruby-red/50" ${current.stripFillersEnabled ? "checked" : ""} />
            ตัดคำติดปากอัตโนมัติ (อืมม, เอ่ออ, um, uh)
          </label>
          <label class="flex flex-row items-center gap-3 text-[13px] text-neutral-300">
            <input id="aiPolishEnabled" type="checkbox" class="w-auto h-4 w-4 rounded border-white/10 bg-white/5 text-ruby-red focus:ring-ruby-red/50" ${current.aiPolishEnabled ? "checked" : ""} />
            ปรับข้อความด้วย AI หลัง Dictate
          </label>
          <div id="custom-prompt-container" class="mt-4 ${current.aiPolishEnabled ? "" : "hidden"}">
            <label class="${FIELD_LABEL} flex justify-between">
              <span>Custom System Prompt (AI Polish)</span>
              <span class="text-neutral-500 font-normal normal-case">Optional</span>
            </label>
            <textarea id="customSystemPrompt" placeholder="ใส่คำสั่งให้ AI จัดฟอร์แมตตามใจชอบ... ถ้าปล่อยว่างจะใช้ค่า Default (แค่แก้ไวยากรณ์)" class="${FIELD_INPUT} min-h-[100px] resize-y text-xs font-mono" style="line-height: 1.5;">${current.customSystemPrompt || ""}</textarea>
          </div>
        </div>

      </div>

      <!-- Right Column -->
      <div class="flex flex-col gap-6">

        <!-- Section: Hotkeys -->
        <div class="rounded-[1.25rem] border border-white/5 bg-white/[0.02] p-5">
          <h2 class="mb-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Hotkeys</h2>
          <div class="mb-5">
            <label class="${FIELD_LABEL} mb-2">ปุ่มคีย์ลัด Dictate</label>
            <div class="flex items-center gap-4">
              <div id="hotkey-badges-hotkey" class="flex shrink-0 gap-1.5">${renderHotkeyBadges(current.hotkey)}</div>
              <button type="button" id="btn-config-hotkey" class="text-xs font-semibold text-ruby-red hover:text-indigo-300 transition-colors">เปลี่ยนคีย์ลัด</button>
            </div>
          </div>
          <div>
            <label class="${FIELD_LABEL} mb-2">ปุ่มคีย์ลัด Translate</label>
            <div class="flex items-center gap-4">
              <div id="hotkey-badges-translateHotkey" class="flex shrink-0 gap-1.5">${renderHotkeyBadges(current.translateHotkey)}</div>
              <button type="button" id="btn-config-translateHotkey" class="text-xs font-semibold text-hot-pink hover:text-pink-300 transition-colors">เปลี่ยนคีย์ลัด</button>
            </div>
          </div>
        </div>

        <!-- Section: General -->
        <div class="rounded-[1.25rem] border border-white/5 bg-white/[0.02] p-5">
          <h2 class="mb-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">General Settings</h2>
          <label class="${FIELD_LABEL}">
            ไมโครโฟน
            <select id="micDeviceId" class="${FIELD_SELECT}">
              <option value="">ค่าเริ่มต้นของระบบ</option>
              ${mics
                .map(
                  (m, i) =>
                    `<option value="${m.deviceId}" ${m.deviceId === current.micDeviceId ? "selected" : ""}>${
                      m.label || `Microphone ${i + 1}`
                    }</option>`,
                )
                .join("")}
            </select>
          </label>
          <div class="grid grid-cols-2 gap-4">
            <label class="${FIELD_LABEL}">
              เวลาอัดสูงสุด (วิ)
              <input id="maxDurationSec" type="number" min="10" max="600" value="${current.maxDurationSec}" class="${FIELD_INPUT}" />
            </label>
            <label class="${FIELD_LABEL}">
              รอบทำ Auto-Tune
              <input id="autoTuneThreshold" type="number" min="1" max="100" value="${current.autoTuneThreshold}" class="${FIELD_INPUT}" />
            </label>
          </div>
          <div class="flex flex-col gap-2 mt-2">
            <label class="flex flex-row items-center gap-3 text-[13px] text-neutral-300">
              <input id="playSound" type="checkbox" class="w-auto h-4 w-4 rounded border-white/10 bg-white/5 text-ruby-red focus:ring-ruby-red/50" ${current.playSound ? "checked" : ""} />
              เล่นเสียงเมื่อเริ่ม/หยุดอัด
            </label>
            <label class="flex flex-row items-center gap-3 text-[13px] text-neutral-300">
              <input id="launchAtStartup" type="checkbox" class="w-auto h-4 w-4 rounded border-white/10 bg-white/5 text-ruby-red focus:ring-ruby-red/50" ${current.launchAtStartup ? "checked" : ""} />
              เปิดแอปอัตโนมัติเมื่อเปิดเครื่อง
            </label>
            <label class="flex flex-row items-center gap-3 text-[13px] text-neutral-300">
              <input id="closeToTray" type="checkbox" class="w-auto h-4 w-4 rounded border-white/10 bg-white/5 text-ruby-red focus:ring-ruby-red/50" ${current.closeToTray ? "checked" : ""} />
              ซ่อนลง Tray เมื่อกดกากบาทปิด (X)
            </label>
          </div>
        </div>

      </div>
    </div>
  `;

  const providerPreset = document.getElementById(
    "provider-preset",
  ) as HTMLSelectElement;
  const apiBaseUrlInput = document.getElementById(
    "apiBaseUrl",
  ) as HTMLInputElement;
  const modelField = document.getElementById("model-field")!;
  const chatModelField = document.getElementById("chatModel-field")!;
  const autoTuneModelField = document.getElementById("autoTuneModel-field")!;
  const saveBtn = document.getElementById("save-btn")!;
  const msg = document.getElementById("save-msg")!;

  const aiPolishEnabledCheckbox = document.getElementById("aiPolishEnabled") as HTMLInputElement;
  const customPromptContainer = document.getElementById("custom-prompt-container")!;
  aiPolishEnabledCheckbox.addEventListener("change", () => {
    if (aiPolishEnabledCheckbox.checked) {
      customPromptContainer.classList.remove("hidden");
    } else {
      customPromptContainer.classList.add("hidden");
    }
  });

  providerPreset.addEventListener("change", () => {
    provider = providerPreset.value as ProviderKey;
    const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
    if (provider !== "custom") {
      apiBaseUrlInput.value = PROVIDER_PRESETS[provider].baseUrl;
      apiBaseUrlInput.disabled = true;
      modelField.innerHTML = generateDropdownHtml(provider, "model", PROVIDER_PRESETS[provider].models[0].id, "Model (STT)");
      chatModelField.innerHTML = generateDropdownHtml(provider, "chatModel", PROVIDER_PRESETS[provider].chatModel, "Chat model (AI polish, Translate)");
      autoTuneModelField.innerHTML = generateDropdownHtml(provider, "autoTuneModel", PROVIDER_PRESETS[provider].autoTuneModel, "Auto-Tune model (วิเคราะห์ประวัติ)");
      apiKeyInput.placeholder = provider === "gemini" ? "AIza..." : provider === "groq" ? "gsk_..." : "sk-...";
    } else {
      apiBaseUrlInput.disabled = false;
      modelField.innerHTML = generateDropdownHtml(provider, "model", "", "Model (STT)");
      chatModelField.innerHTML = generateDropdownHtml(provider, "chatModel", "", "Chat model (AI polish, Translate)");
      autoTuneModelField.innerHTML = generateDropdownHtml(provider, "autoTuneModel", "", "Auto-Tune model (วิเคราะห์ประวัติ)");
      apiKeyInput.placeholder = "sk-...";
    }
  });

  saveBtn.addEventListener("click", async () => {
    (saveBtn as HTMLButtonElement).disabled = true;
    msg.className = "mt-1 h-4 text-xs text-neutral-200";
    msg.textContent = "กำลังบันทึก…";
    const apiKey = (
      document.getElementById("apiKey") as HTMLInputElement
    ).value.trim();
    const apiBaseUrl = apiBaseUrlInput.value.trim();
    const model = (
      document.getElementById("model") as HTMLInputElement | HTMLSelectElement
    ).value.trim();
    const language = (
      document.getElementById("language") as HTMLSelectElement
    ).value;
    const translateTargetLang = (
      document.getElementById("translateTargetLang") as HTMLSelectElement
    ).value;
    const stripFillersEnabled = (
      document.getElementById("stripFillersEnabled") as HTMLInputElement
    ).checked;
    const aiPolishEnabled = (
      document.getElementById("aiPolishEnabled") as HTMLInputElement
    ).checked;
    const customSystemPrompt = (
      document.getElementById("customSystemPrompt") as HTMLTextAreaElement
    ).value;
    const chatModel = (
      document.getElementById("chatModel") as HTMLInputElement | HTMLSelectElement
    ).value.trim();
    const autoTuneModel = (
      document.getElementById("autoTuneModel") as HTMLInputElement | HTMLSelectElement
    ).value.trim();
    const micDeviceId = (
      document.getElementById("micDeviceId") as HTMLSelectElement
    ).value;
    const maxDurationSec =
      Number(
        (document.getElementById("maxDurationSec") as HTMLInputElement).value,
      ) || 120;
    const autoTuneThreshold =
      Number(
        (document.getElementById("autoTuneThreshold") as HTMLInputElement).value,
      ) || 10;
    const playSound = (document.getElementById("playSound") as HTMLInputElement)
      .checked;
    const launchAtStartup = (
      document.getElementById("launchAtStartup") as HTMLInputElement
    ).checked;

    const closeToTray = (
      document.getElementById("closeToTray") as HTMLInputElement
    ).checked;

    try {
      await window.typeless.setSettings({
        apiKey,
        apiBaseUrl,
        model,
        language,
        translateTargetLang,
        stripFillersEnabled,
        aiPolishEnabled,
        customSystemPrompt,
        chatModel,
        autoTuneModel,
        micDeviceId,
        maxDurationSec,
        playSound,
        launchAtStartup,
        closeToTray,
        autoTuneThreshold,
      });
      msg.className = "mt-1 h-4 text-xs text-emerald-600";
      msg.textContent = "บันทึกแล้ว";
    } catch {
      msg.className = "mt-1 h-4 text-xs text-red-600";
      msg.textContent = "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
    } finally {
      (saveBtn as HTMLButtonElement).disabled = false;
      setTimeout(() => (msg.textContent = ""), 1500);
    }
  });

  document.getElementById("btn-config-hotkey")?.addEventListener("click", () => {
    openHotkeyModal("Dictate", current.hotkey, async (newHotkey) => {
      await window.typeless.setSettings({ hotkey: newHotkey } as Partial<AppSettings>);
      current.hotkey = newHotkey;
      const badges = document.getElementById("hotkey-badges-hotkey");
      if (badges) badges.innerHTML = renderHotkeyBadges(newHotkey);
    });
  });

  document.getElementById("btn-config-translateHotkey")?.addEventListener("click", () => {
    openHotkeyModal("Translate", current.translateHotkey, async (newHotkey) => {
      await window.typeless.setSettings({ translateHotkey: newHotkey } as Partial<AppSettings>);
      current.translateHotkey = newHotkey;
      const badges = document.getElementById("hotkey-badges-translateHotkey");
      if (badges) badges.innerHTML = renderHotkeyBadges(newHotkey);
    });
  });
}
