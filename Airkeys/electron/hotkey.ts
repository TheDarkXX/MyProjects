import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const reqName = 'uiohook-napi';
const { uIOhook, UiohookKey } = require(reqName);

// Map electron accelerator to uiohook keycode
const keyMap: Record<string, number> = {
  'space': UiohookKey.Space,
  'enter': UiohookKey.Enter,
  'escape': UiohookKey.Escape,
  'esc': UiohookKey.Escape,
  'tab': UiohookKey.Tab,
  'backspace': UiohookKey.Backspace,
  'delete': UiohookKey.Delete,
};
for (let i = 65; i <= 90; i++) {
  const char = String.fromCharCode(i).toLowerCase();
  keyMap[char] = UiohookKey[char.toUpperCase() as keyof typeof UiohookKey] as number;
}
for (let i = 0; i <= 9; i++) {
  keyMap[i.toString()] = UiohookKey[`Numpad${i}` as keyof typeof UiohookKey] as number;
}

interface ParsedAccelerator {
  keycode: number | null;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export function parseAccelerator(accel: string): ParsedAccelerator {
  const parts = accel.toLowerCase().split('+');
  const parsed: ParsedAccelerator = {
    keycode: null,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control' || part === 'commandorcontrol' || part === 'cmdorctrl') {
      parsed.ctrlKey = true;
    } else if (part === 'shift') {
      parsed.shiftKey = true;
    } else if (part === 'alt') {
      parsed.altKey = true;
    } else if (part === 'meta' || part === 'cmd' || part === 'command' || part === 'super') {
      parsed.metaKey = true;
    } else if (keyMap[part]) {
      parsed.keycode = keyMap[part];
    }
  }

  return parsed;
}

export function matchEvent(parsed: ParsedAccelerator, event: any): boolean {
  if (parsed.keycode && event.keycode !== parsed.keycode) return false;
  if (parsed.ctrlKey && !event.ctrlKey) return false;
  if (parsed.shiftKey && !event.shiftKey) return false;
  if (parsed.altKey && !event.altKey) return false;
  if (parsed.metaKey && !event.metaKey) return false;
  return true;
}
