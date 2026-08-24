import { mountHome } from "./pages/home";
import { mountHistory } from "./pages/history";
import { mountDictionary } from "./pages/dictionary";
import { mountSettings } from "./pages/settings";
import { icons } from "./icons";

type Route = "/" | "/history" | "/dictionary" | "/settings";

const NAV_ITEMS: { route: Route; label: string; icon: string }[] = [
  { route: "/", label: "Home", icon: icons.home },
  { route: "/history", label: "History", icon: icons.history },
  { route: "/dictionary", label: "Dictionary", icon: icons.book },
];

const NAV_ITEM_CLASS =
  "relative flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[14px] font-medium text-neutral-400 transition-all [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:text-neutral-400 hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby-red/50 data-[active=true]:bg-gradient-to-r data-[active=true]:from-ruby-red/15 data-[active=true]:to-transparent data-[active=true]:font-bold data-[active=true]:text-white data-[active=true]:[&_svg]:text-ruby-red before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[3px] before:rounded-r-full before:bg-transparent data-[active=true]:before:bg-ruby-red";

function currentRoute(): Route {
  const hash = location.hash.replace(/^#/, "") || "/";
  if (hash === "/history" || hash === "/dictionary" || hash === "/settings")
    return hash;
  return "/";
}

export function mountShell(root: HTMLElement) {
  root.innerHTML = `
    <div class="flex h-screen bg-[#0A0A0A] text-neutral-200">
      <!-- Sidebar -->
      <div class="flex w-64 shrink-0 flex-col bg-[#0F0F13] px-3 py-4 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-10">
        <!-- Logo Area -->
        <div class="relative mb-8 flex items-center gap-3 px-3">
          <div class="absolute -left-4 top-0 h-12 w-12 rounded-full bg-ruby-red opacity-[0.15] blur-[16px] pointer-events-none"></div>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-ruby-red to-hot-pink text-white shadow-lg shadow-ruby-red/20 [&_svg]:h-5 [&_svg]:w-5">
            ${icons.logo}
          </div>
          <div class="flex flex-col">
            <span class="text-[15px] font-extrabold tracking-tight text-white leading-none">AirKeys</span>
            <span class="text-[11px] font-mono text-neutral-500 mt-1">v1.2.3</span>
          </div>
        </div>

        <!-- Navigation -->
        <div class="mb-2 px-3 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Menu</div>
        <nav class="flex flex-col gap-1 mb-8" id="nav"></nav>
        
        <!-- Divider -->
        <div class="mx-3 mb-6 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
        
        <!-- Quick Actions -->
        <div class="mb-2 px-3 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Quick Actions</div>
        <div class="flex flex-col gap-2 px-1 mb-auto">
          <button class="group flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.06] border border-white/[0.02]" id="btn-quick-dictate">
            <div class="flex items-center gap-2 text-[13px] text-neutral-300 group-hover:text-white [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-ruby-red">${icons.mic}<span>Dictate</span></div>
            <span class="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400" id="shortcut-dictate">Ctrl+Space</span>
          </button>
          <button class="group flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.06] border border-white/[0.02]" id="btn-quick-translate">
            <div class="flex items-center gap-2 text-[13px] text-neutral-300 group-hover:text-white [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-hot-pink">${icons.languages}<span>Translate</span></div>
            <span class="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400" id="shortcut-translate">Ctrl+Alt+T</span>
          </button>
        </div>

        <div class="mt-auto py-1">
          <button id="nav-settings" class="${NAV_ITEM_CLASS}" title="Settings" aria-label="Settings">
            ${icons.settings}<span>Settings</span>
          </button>
        </div>
      </div>
      
      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto px-12 py-10" id="content"></div>
    </div>
  `;

  const nav = document.getElementById("nav")!;
  const content = document.getElementById("content")!;
  const navSettings = document.getElementById("nav-settings")!;

  function renderNav(active: Route) {
    nav.innerHTML = NAV_ITEMS.map(
      (item) => `
      <button class="${NAV_ITEM_CLASS}" data-route="${item.route}" data-active="${item.route === active}">
        ${item.icon}<span>${item.label}</span>
      </button>
    `,
    ).join("");
    nav
      .querySelectorAll<HTMLButtonElement>("button[data-route]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          location.hash = btn.dataset.route!;
        });
      });
    navSettings.dataset.active = String(active === "/settings");
  }

  let currentUnmount: (() => void) | void;

  async function renderPage(route: Route) {
    if (currentUnmount) currentUnmount();
    currentUnmount = undefined;

    renderNav(route);
    content.scrollTop = 0;
    if (route === "/") currentUnmount = await mountHome(content);
    else if (route === "/history") currentUnmount = await mountHistory(content);
    else if (route === "/dictionary") currentUnmount = await mountDictionary(content);
    else if (route === "/settings") currentUnmount = await mountSettings(content);
  }

  navSettings.addEventListener("click", () => {
    location.hash = "/settings";
  });

  window.addEventListener("hashchange", () => renderPage(currentRoute()));
  window.typeless.onNavigate((route) => {
    location.hash = route;
    renderPage(currentRoute());
  });

  renderPage(currentRoute());
  
  // Initialize Quick Action shortcuts
  window.typeless.getSettings().then(settings => {
    const dict = document.getElementById("shortcut-dictate");
    const trans = document.getElementById("shortcut-translate");
    if (dict) dict.textContent = settings.hotkey || "None";
    if (trans) trans.textContent = settings.translateHotkey || "None";
  });
}
