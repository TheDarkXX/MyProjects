// ⚙️ Settings System
var drviewSettings = {
  showYaml: false,
  autoOutline: false,
  progressBar: true,
  defaultFontSize: 14,
  autoRenderMermaid: true,
  autoRenderTsv: true,
  codeLineNumbers: false,
  wordWrap: false,
  exportScale: 2,
  mermaidExportBg: 'white',
  tsvExportBg: 'dark',
  customCss: '',
  activeCssPreset: 'saved',
  savedPresets: {}
};

function loadSettings() {
  try {
    var saved = localStorage.getItem('drview_settings');
    if (saved) {
      var parsed = JSON.parse(saved);
      for (var k in parsed) {
        if (drviewSettings.hasOwnProperty(k)) drviewSettings[k] = parsed[k];
      }
    }
  } catch(e) {}
  applyAllSettings();
}

function saveSettings() {
  try { localStorage.setItem('drview_settings', JSON.stringify(drviewSettings)); } catch(e) {}
}

function applyAllSettings() {
  // YAML
  var fmEl = document.querySelector('.frontmatter-badge-container');
  if (fmEl) fmEl.style.display = drviewSettings.showYaml ? '' : 'none';

  // Outline
  if (!drviewSettings.autoOutline && !window._outlineUserToggled) {
    outlineVisible = false;
    var op = document.getElementById('outlinePanel');
    var ob = document.getElementById('outlineToggleBtn');
    if (op) op.classList.remove('active');
    if (ob) ob.classList.remove('active');
    checkFocusMode();
  }

  // Progress bar
  var bar = document.getElementById('progressBar');
  if (bar) bar.style.display = drviewSettings.progressBar ? '' : 'none';

  // Font size
  currentZoom = drviewSettings.defaultFontSize;
  var pv = document.getElementById('pv');
  if (pv) pv.style.fontSize = currentZoom + 'px';

  // Word wrap
  if (pv) pv.style.overflowWrap = drviewSettings.wordWrap ? 'break-word' : '';
  if (pv) pv.style.wordBreak = drviewSettings.wordWrap ? 'break-word' : '';

  // Code line numbers
  document.body.classList.toggle('code-line-numbers', drviewSettings.codeLineNumbers);

  // Update toggle states in settings panel
  document.querySelectorAll('.setting-toggle').forEach(function(el) {
    var key = el.getAttribute('data-key');
    if (key && drviewSettings[key] !== undefined) {
      el.classList.toggle('active', !!drviewSettings[key]);
    }
  });
  document.querySelectorAll('.setting-select').forEach(function(el) {
    var key = el.getAttribute('data-key');
    if (key && drviewSettings[key] !== undefined) {
      el.value = drviewSettings[key];
    }
  });
  var fontSlider = document.getElementById('setting-fontSize');
  if (fontSlider) {
    fontSlider.value = drviewSettings.defaultFontSize;
    var label = document.getElementById('setting-fontSize-label');
    if (label) label.textContent = drviewSettings.defaultFontSize + 'px';
  }

  // Custom CSS
  var customCssEl = document.getElementById('drview-custom-css');
  if (!customCssEl) {
    customCssEl = document.createElement('style');
    customCssEl.id = 'drview-custom-css';
    document.head.appendChild(customCssEl);
  }
  customCssEl.textContent = drviewSettings.customCss || '';
  
  var customCssArea = document.getElementById('setting-customCss');
  if (customCssArea && customCssArea.value !== (drviewSettings.customCss || '')) {
    customCssArea.value = drviewSettings.customCss || '';
  }
  
  if (customCssArea) {
      let isBuiltIn = drviewSettings.activeCssPreset && drviewSettings.activeCssPreset !== 'saved' && !drviewSettings.activeCssPreset.startsWith('user-');
      if (isBuiltIn) {
          customCssArea.setAttribute('readonly', 'true');
          customCssArea.style.opacity = '0.6';
          customCssArea.title = 'Built-in presets cannot be edited. Switch to "Saved" to write custom CSS.';
      } else {
          customCssArea.removeAttribute('readonly');
          customCssArea.style.opacity = '1';
          customCssArea.title = '';
      }
  }
  
  if (typeof renderCustomPresets === 'function') {
    renderCustomPresets();
  }
}

function toggleSetting(key) {
  drviewSettings[key] = !drviewSettings[key];
  saveSettings();
  applyAllSettings();
}

function setSetting(key, value) {
  drviewSettings[key] = value;
  saveSettings();
  applyAllSettings();
}

var settingsOpen = false;
function toggleSettingsPanel() {
  settingsOpen = !settingsOpen;
  var panel = document.getElementById('settingsPanel');
  var overlay = document.getElementById('settingsOverlay');
  if (panel) panel.classList.toggle('open', settingsOpen);
  if (overlay) overlay.classList.toggle('open', settingsOpen);
}

function closeSettings() {
  settingsOpen = false;
  var panel = document.getElementById('settingsPanel');
  var overlay = document.getElementById('settingsOverlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

let currentZoom = 14;
function zoomPreview(step) {
  currentZoom += (step * 1);
  if (currentZoom < 10) currentZoom = 10;
  if (currentZoom > 30) currentZoom = 30;
  document.getElementById('pv').style.fontSize = currentZoom + 'px';
  drviewSettings.defaultFontSize = currentZoom;
  saveSettings();
  var label = document.getElementById('setting-fontSize-label');
  if (label) label.textContent = currentZoom + 'px';
  var slider = document.getElementById('setting-fontSize');
  if (slider) slider.value = currentZoom;
}

let outlineVisible = false;
function toggleOutline() {
  outlineVisible = !outlineVisible;
  document.getElementById('outlinePanel').classList.toggle('active', outlineVisible);
  document.getElementById('outlineToggleBtn').classList.toggle('active', outlineVisible);
  checkFocusMode();
}

let focusMode = true;
function toggleFocus() {
  focusMode = !focusMode;
  document.getElementById('focusBtn').classList.toggle('active', focusMode);
  if (focusMode) {
    outlineVisible = false;
    document.getElementById('outlinePanel').classList.remove('active');
    document.getElementById('outlineToggleBtn').classList.remove('active');
  } else {
    outlineVisible = true;
    document.getElementById('outlinePanel').classList.add('active');
    document.getElementById('outlineToggleBtn').classList.add('active');
  }
}

function checkFocusMode() {
  if (!outlineVisible) {
    document.getElementById('focusBtn').classList.add('active');
    focusMode = true;
  } else {
    document.getElementById('focusBtn').classList.remove('active');
    focusMode = false;
  }
}

// 🎯 1. Outline Builder + Scroll-Spy Elements Map
let headingElements = [];
function buildOutline() {
  var pv = document.getElementById('pv');
  var oc = document.getElementById('outlineContent');
  var toggleBtn = document.getElementById('outlineToggleBtn');
  var headings = pv.querySelectorAll('h1, h2, h3, h4');
  
  headingElements = [];
  if (headings.length === 0) {
    toggleBtn.style.display = 'none';
    document.getElementById('outlinePanel').classList.remove('active');
    return;
  }
  
  toggleBtn.style.display = 'inline-block';
  
  var html = '';
  for (var i = 0; i < headings.length; i++) {
    var h = headings[i];
    if (!h.id) h.id = 'heading-' + i;
    var level = parseInt(h.tagName.substring(1));
    var text = h.innerText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html += '<div class="outline-item outline-l' + level + '" id="spy-item-' + i + '" onclick="document.getElementById(\'' + h.id + '\').scrollIntoView({behavior:\'smooth\'})" title="' + text + '">' + text + '</div>';
    headingElements.push({ id: h.id, spyId: 'spy-item-' + i, el: h });
  }
  oc.innerHTML = html;
  
  if (outlineVisible) {
    document.getElementById('outlinePanel').classList.add('active');
    toggleBtn.classList.add('active');
  }
  updateScrollSpy();
}

// 🎯 Active Scroll-Spy
function updateScrollSpy() {
  if (!headingElements.length) return;
  var pv = document.getElementById('pv');
  var pvTop = pv.getBoundingClientRect().top;
  
  var activeIndex = 0;
  for (var i = 0; i < headingElements.length; i++) {
    var rect = headingElements[i].el.getBoundingClientRect();
    // If heading is near top or scrolled past
    if (rect.top - pvTop <= 140) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // If scrolled to bottom, highlight last heading
  if (pv.scrollHeight - pv.scrollTop - pv.clientHeight < 20) {
    activeIndex = headingElements.length - 1;
  }

  for (var j = 0; j < headingElements.length; j++) {
    var item = document.getElementById(headingElements[j].spyId);
    if (!item) continue;
    if (j === activeIndex) {
      if (!item.classList.contains('active-spy')) {
        item.classList.add('active-spy');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else {
      item.classList.remove('active-spy');
    }
  }
}

// 📊 2. Reading Progress Bar
function updateReadingProgress() {
  var pv = document.getElementById('pv');
  var bar = document.getElementById('progressBar');
  if (!pv || !bar) return;
  
  var maxScroll = pv.scrollHeight - pv.clientHeight;
  if (maxScroll <= 0) {
    bar.style.width = '100%';
    return;
  }
  var pct = Math.min(100, Math.max(0, (pv.scrollTop / maxScroll) * 100));
  bar.style.width = pct + '%';
}

// 📋 3. Code Block Wrapper, Language Badge & One-Click Copy
function enhanceCodeBlocks() {
  var pv = document.getElementById('pv');
  if (!pv) return;
  var pres = pv.querySelectorAll('pre');
  
  pres.forEach(function(pre) {
    if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrapper')) return;
    if (pre.classList.contains('mermaid-code-view') || pre.classList.contains('tsv-code-view')) return;
    
    var code = pre.querySelector('code');
    var lang = 'CODE';
    if (code) {
      var classes = code.className.split(' ');
      for (var i = 0; i < classes.length; i++) {
        if (classes[i].startsWith('language-')) {
          var detected = classes[i].replace('language-', '').toUpperCase();
          if (detected) lang = detected;
          break;
        }
      }
    }
    
    // Skip mermaid and tsv/csv - handled by their own interactive renderers
    if (lang === 'MERMAID' || lang === 'TSV' || lang === 'CSV') return;
    
    var wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    
    var header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = '<span class="code-lang">' + lang + '</span><button class="code-copy-btn" onclick="copyCodeBlock(this)">📋 Copy</button>';
    
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
}

function copyCodeBlock(btn) {
  var wrapper = btn.closest('.code-block-wrapper');
  if (!wrapper) return;
  var code = wrapper.querySelector('pre code') || wrapper.querySelector('pre');
  if (!code) return;
  
  var text = code.innerText || code.textContent;
  navigator.clipboard.writeText(text).then(function() {
    btn.innerHTML = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.innerHTML = '📋 Copy';
      btn.classList.remove('copied');
    }, 1800);
  }).catch(function(err) {
    console.error('Failed to copy: ', err);
  });
}

// Open Raw Code
function openRawCode() {
  if (typeof vscodeApi !== 'undefined') {
    vscodeApi.postMessage({ command: 'openRawCode' });
  } else {
    alert("Raw code editing will be supported in Phase 3");
  }
}

// Hotkey: Ctrl + Mouse Wheel for Zoom In/Out
window.addEventListener('wheel', function(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomPreview(1);
    } else if (e.deltaY > 0) {
      zoomPreview(-1);
    }
  }
}, { passive: false });

// 🎨 5. Custom CSS Presets
let userBackupCss = '';
const CSS_PRESETS = {
  'billpay-dark': `/* BillPay Dark (AG Design) */
body, .preview { background: #080818; color: #EEEEFF; font-family: 'Inter', system-ui, sans-serif; }
.preview h1, .preview h2, .preview h3 { color: #823AFD; border-bottom: 1px solid rgba(255,255,255,0.06); }
.preview a { color: #FC2D79; text-decoration: none; }
.preview pre { background: #141430; border: 1px solid rgba(255,255,255,0.06); box-shadow: 5px 5px 16px rgba(0,0,0,0.55), -2px -2px 8px rgba(255,255,255,0.022); border-radius: 8px; }
.preview code { color: #FD5514; font-family: 'JetBrains Mono', monospace; }
.preview table th { background: #141430; color: #823AFD; border-color: rgba(255,255,255,0.06); }
.preview table td { border-color: rgba(255,255,255,0.06); }`,

  'cyberpunk-dark': `/* Cyberpunk Dark */
body, .preview { background: #0b0c10; color: #c5c6c7; font-family: 'Inter', sans-serif; line-height: 1.6; }
.preview h1, .preview h2, .preview h3 { color: #f2a900; text-shadow: 0 0 8px rgba(242,169,0,0.6); border-bottom: 1px solid #45a29e; padding-bottom: 0.3em; }
.preview a { color: #66fcf1; text-decoration: none; border-bottom: 1px dashed #66fcf1; }
.preview pre { background: rgba(31,40,51,0.8); border: 1px solid #45a29e; border-radius: 4px; box-shadow: inset 0 0 10px rgba(102,252,241,0.1); padding: 16px; }
.preview code { color: #ff003c; font-family: 'Fira Code', monospace; background: rgba(255,0,60,0.1); padding: 0.2em 0.4em; border-radius: 4px; }
.preview blockquote { border-left: 4px solid #f2a900; background: rgba(242,169,0,0.05); padding: 10px 15px; margin-left: 0; color: #45a29e; }
.preview strong { color: #66fcf1; font-weight: 700; text-shadow: 0 0 4px rgba(102,252,241,0.4); }
.preview em { color: #c5c6c7; font-style: italic; border-bottom: 1px dotted #c5c6c7; }
.preview del { color: #45a29e; text-decoration-color: #ff003c; }
.preview mark { background: #ff003c; color: #fff; text-shadow: none; }
.preview hr { border-color: #1f2833; box-shadow: 0 0 5px #45a29e; }
.preview ul, .preview ol { color: #c5c6c7; }
.preview li::marker { color: #f2a900; font-weight: bold; }`,

  'dracula-dark': `/* Dracula Dark */
body, .preview { background: #282a36; color: #f8f8f2; font-family: 'Fira Code', 'Inter', sans-serif; line-height: 1.6; }
.preview h1, .preview h2, .preview h3 { color: #bd93f9; border-bottom: 1px solid #44475a; }
.preview a { color: #8be9fd; text-decoration: underline; text-decoration-color: #6272a4; }
.preview pre { background: #44475a; border: 1px solid #6272a4; border-radius: 6px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
.preview code { color: #ff79c6; background: rgba(255,121,198,0.1); padding: 0.2em 0.4em; border-radius: 4px; }
.preview blockquote { border-left: 4px solid #50fa7b; color: #f1fa8c; padding: 10px 15px; margin-left: 0; background: rgba(80,250,123,0.05); }
.preview strong { color: #ffb86c; font-weight: bold; }
.preview em { color: #f1fa8c; font-style: italic; }
.preview del { color: #6272a4; text-decoration-color: #ff5555; }
.preview mark { background: #ff5555; color: #f8f8f2; }
.preview hr { border-color: #6272a4; }
.preview li::marker { color: #ff79c6; }`,

  'nord-dark': `/* Nord Dark */
body, .preview { background: #2e3440; color: #d8dee9; font-family: 'Inter', sans-serif; line-height: 1.7; }
.preview h1, .preview h2, .preview h3 { color: #88c0d0; border-bottom: 1px solid #434c5e; font-weight: 300; }
.preview a { color: #81a1c1; text-decoration: none; border-bottom: 1px solid #81a1c1; transition: 0.2s; }
.preview a:hover { color: #88c0d0; border-bottom-color: #88c0d0; }
.preview pre { background: #3b4252; border: 1px solid #4c566a; border-radius: 4px; padding: 16px; }
.preview code { color: #ebcb8b; background: rgba(235,203,139,0.1); padding: 0.2em 0.4em; border-radius: 3px; }
.preview blockquote { border-left: 3px solid #5e81ac; color: #a3be8c; padding: 10px 15px; margin-left: 0; }
.preview strong { color: #eceff4; font-weight: 600; }
.preview em { color: #d08770; font-style: italic; }
.preview del { color: #4c566a; text-decoration-color: #bf616a; }
.preview mark { background: #bf616a; color: #eceff4; }
.preview hr { border-color: #4c566a; }
.preview li::marker { color: #81a1c1; }`,

  'tokyo-dark': `/* Tokyo Night Dark */
body, .preview { background: #1a1b26; color: #a9b1d6; font-family: 'Inter', sans-serif; line-height: 1.6; }
.preview h1, .preview h2, .preview h3 { color: #7aa2f7; font-weight: 700; border-bottom: 1px solid #292e42; }
.preview a { color: #bb9af7; text-decoration: none; }
.preview a:hover { text-decoration: underline; }
.preview pre { background: #24283b; border: 1px solid #414868; border-radius: 8px; padding: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
.preview code { color: #ff9e64; background: rgba(255,158,100,0.1); padding: 0.2em 0.4em; border-radius: 4px; }
.preview blockquote { border-left: 4px solid #9ece6a; background: rgba(158,206,106,0.05); padding: 10px 15px; margin-left: 0; color: #7dcfff; }
.preview strong { color: #c0caf5; font-weight: bold; text-shadow: 0 0 5px rgba(192,202,245,0.3); }
.preview em { color: #e0af68; font-style: italic; }
.preview del { color: #565f89; text-decoration-color: #f7768e; }
.preview mark { background: #f7768e; color: #1a1b26; }
.preview hr { border-color: #292e42; }
.preview li::marker { color: #bb9af7; }`,

  'vercel-dark': `/* Vercel Dark (SaaS) */
body, .preview { background: #000000; color: #ededed; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; line-height: 1.6; }
.preview h1, .preview h2, .preview h3 { background: linear-gradient(to right, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; border-bottom: 1px solid #333; padding-bottom: 0.3em; letter-spacing: -0.04em; }
.preview a { color: #3291ff; text-decoration: none; transition: 0.2s; }
.preview a:hover { text-decoration: underline; }
.preview pre { background: #111111; border: 1px solid #333; border-radius: 6px; padding: 16px; box-shadow: 0 0 0 1px rgba(255,255,255,0.1); }
.preview code { color: #f81ce5; background: rgba(248,28,229,0.1); padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
.preview blockquote { border-left: 3px solid #fff; padding: 10px 15px; margin-left: 0; color: #a1a1aa; }
.preview strong { color: #fff; font-weight: 700; }
.preview em { color: #a1a1aa; font-style: italic; }
.preview del { color: #333; text-decoration-color: #fff; }
.preview mark { background: rgba(255,255,255,0.8); color: #000; }
.preview hr { border-color: #333; }
.preview li::marker { color: #888; }`
};

function saveNewCustomPreset() {
  var nameInput = document.getElementById('new-preset-name');
  if (!nameInput) return;
  var name = nameInput.value.trim();
  if (!name) return;
  
  var currentCss = document.getElementById('setting-customCss').value;
  if (!drviewSettings.savedPresets) drviewSettings.savedPresets = {};
  drviewSettings.savedPresets[name] = currentCss;
  drviewSettings.activeCssPreset = 'user-' + name;
  
  saveSettings();
  renderCustomPresets();
  nameInput.value = '';
}

function renderCustomPresets() {
  var container = document.getElementById('custom-presets-container');
  if (!container) return;
  container.innerHTML = '';
  if (!drviewSettings.savedPresets) return;
  
  for (var name in drviewSettings.savedPresets) {
      if (!drviewSettings.savedPresets.hasOwnProperty(name)) continue;
      var btn = document.createElement('button');
      btn.className = 'css-preset-btn';
      btn.style.borderColor = '#2ea043';
      btn.innerText = name;
      btn.onclick = (function(n) { 
          return function() { applyCssPreset('user-' + n); }; 
      })(name);
      container.appendChild(btn);
  }
}

function applyCssPreset(presetName) {
  let cssText = '';
  if (presetName === 'saved') {
      cssText = userBackupCss || '';
  } else if (presetName.startsWith('user-')) {
      var name = presetName.substring(5);
      if (drviewSettings.savedPresets && drviewSettings.savedPresets[name]) {
          cssText = drviewSettings.savedPresets[name];
      }
  } else {
      let isPreset = false;
      if (Object.values(CSS_PRESETS).includes(drviewSettings.customCss)) isPreset = true;
      if (drviewSettings.savedPresets && Object.values(drviewSettings.savedPresets).includes(drviewSettings.customCss)) isPreset = true;
      
      if (!userBackupCss && drviewSettings.customCss && !isPreset) {
          userBackupCss = drviewSettings.customCss; // backup typed css before overriding
      }
      cssText = CSS_PRESETS[presetName] || '';
  }
  
  drviewSettings.activeCssPreset = presetName;
  
  var textarea = document.getElementById('setting-customCss');
  if (textarea) {
      textarea.value = cssText;
      drviewSettings.customCss = cssText;
      saveSettings();
      applyAllSettings();
  }
}

// 📊 4. Mermaid Modern Multi-Theme System & Interactive Controls
var mermaidScales = {};
var originalMermaidTexts = {}; 
var currentMermaidThemes = {};

var MERMAID_THEMES = {
  dark: {
    darkMode: true,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    background: '#0d1117',
    mainBkg: '#161b22',
    primaryColor: '#1f6feb',
    primaryTextColor: '#f0f6fc',
    primaryBorderColor: '#58a6ff',
    lineColor: '#58a6ff',
    secondaryColor: '#823afd',
    secondaryTextColor: '#ffffff',
    secondaryBorderColor: '#a060ff',
    tertiaryColor: '#161b22',
    tertiaryTextColor: '#f0f6fc',
    tertiaryBorderColor: '#30363d',
    nodeBorder: '#58a6ff',
    nodeTextColor: '#f0f6fc',
    textColor: '#f0f6fc',
    titleColor: '#58a6ff',
    actorBkg: '#1f6feb',
    actorBorder: '#58a6ff',
    actorTextColor: '#ffffff',
    actorLineColor: '#58a6ff',
    signalColor: '#58a6ff',
    signalTextColor: '#f0f6fc',
    labelBoxBkgColor: '#161b22',
    labelBoxBorderColor: '#30363d',
    labelTextColor: '#f0f6fc',
    loopTextColor: '#f0f6fc',
    noteBorderColor: '#2ea043',
    noteBkgColor: '#238636',
    noteTextColor: '#ffffff',
    activationBorderColor: '#58a6ff',
    activationBkgColor: 'rgba(31, 111, 235, 0.4)',
    sequenceNumberColor: '#ffffff'
  },
  cyberpunk: {
    darkMode: true,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    background: '#0a0a0f',
    mainBkg: '#12121a',
    primaryColor: '#00f0ff',
    primaryTextColor: '#00f0ff',
    primaryBorderColor: '#00f0ff',
    lineColor: '#ff007f',
    secondaryColor: '#ff007f',
    secondaryTextColor: '#ffffff',
    secondaryBorderColor: '#ff007f',
    tertiaryColor: '#1a1a24',
    tertiaryTextColor: '#ffe600',
    tertiaryBorderColor: '#ffe600',
    nodeBorder: '#00f0ff',
    nodeTextColor: '#ffffff',
    textColor: '#00f0ff',
    titleColor: '#ffe600',
    actorBkg: '#ff007f',
    actorBorder: '#00f0ff',
    actorTextColor: '#ffffff',
    actorLineColor: '#00f0ff',
    signalColor: '#00f0ff',
    signalTextColor: '#ffe600',
    labelBoxBkgColor: '#12121a',
    labelBoxBorderColor: '#ff007f',
    labelTextColor: '#00f0ff',
    noteBkgColor: '#ffe600',
    noteBorderColor: '#ffe600',
    noteTextColor: '#0a0a0f'
  },
  dracula: {
    darkMode: true,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    background: '#282a36',
    mainBkg: '#44475a',
    primaryColor: '#bd93f9',
    primaryTextColor: '#f8f8f2',
    primaryBorderColor: '#ff79c6',
    lineColor: '#ff79c6',
    secondaryColor: '#50fa7b',
    secondaryTextColor: '#282a36',
    secondaryBorderColor: '#50fa7b',
    tertiaryColor: '#6272a4',
    tertiaryTextColor: '#f8f8f2',
    tertiaryBorderColor: '#6272a4',
    nodeBorder: '#bd93f9',
    nodeTextColor: '#f8f8f2',
    textColor: '#f8f8f2',
    titleColor: '#8be9fd',
    actorBkg: '#bd93f9',
    actorBorder: '#ff79c6',
    actorTextColor: '#282a36',
    actorLineColor: '#8be9fd',
    signalColor: '#50fa7b',
    signalTextColor: '#f8f8f2',
    labelBoxBkgColor: '#44475a',
    labelBoxBorderColor: '#6272a4',
    labelTextColor: '#f8f8f2'
  },
  emerald: {
    darkMode: true,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    background: '#0d1b15',
    mainBkg: '#142920',
    primaryColor: '#2ea043',
    primaryTextColor: '#7ee787',
    primaryBorderColor: '#3fb950',
    lineColor: '#3fb950',
    secondaryColor: '#238636',
    secondaryTextColor: '#ffffff',
    secondaryBorderColor: '#56d364',
    tertiaryColor: '#1b382c',
    tertiaryTextColor: '#e6edf3',
    tertiaryBorderColor: '#2ea043',
    nodeBorder: '#3fb950',
    nodeTextColor: '#ffffff',
    textColor: '#7ee787',
    titleColor: '#56d364',
    actorBkg: '#2ea043',
    actorBorder: '#56d364',
    actorTextColor: '#ffffff',
    actorLineColor: '#3fb950',
    signalColor: '#3fb950',
    signalTextColor: '#7ee787'
  },
  sunset: {
    darkMode: true,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    background: '#1a1215',
    mainBkg: '#261a1f',
    primaryColor: '#ff7b72',
    primaryTextColor: '#ffdcd7',
    primaryBorderColor: '#ffa657',
    lineColor: '#ffa657',
    secondaryColor: '#f778ba',
    secondaryTextColor: '#ffffff',
    secondaryBorderColor: '#ff7b72',
    tertiaryColor: '#36242c',
    tertiaryTextColor: '#f0f6fc',
    tertiaryBorderColor: '#ff7b72',
    nodeBorder: '#ffa657',
    nodeTextColor: '#ffffff',
    textColor: '#ffdcd7',
    titleColor: '#ffa657',
    actorBkg: '#ff7b72',
    actorBorder: '#ffa657',
    actorTextColor: '#ffffff',
    actorLineColor: '#ffa657',
    signalColor: '#f778ba',
    signalTextColor: '#ffdcd7'
  },
  nord: {
    darkMode: true,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    background: '#242933',
    mainBkg: '#2e3440',
    primaryColor: '#88c0d0',
    primaryTextColor: '#eceff4',
    primaryBorderColor: '#81a1c1',
    lineColor: '#88c0d0',
    secondaryColor: '#5e81ac',
    secondaryTextColor: '#eceff4',
    secondaryBorderColor: '#88c0d0',
    tertiaryColor: '#3b4252',
    tertiaryTextColor: '#e5e9f0',
    tertiaryBorderColor: '#4c566a',
    nodeBorder: '#88c0d0',
    nodeTextColor: '#eceff4',
    textColor: '#eceff4',
    titleColor: '#88c0d0',
    actorBkg: '#5e81ac',
    actorBorder: '#88c0d0',
    actorTextColor: '#eceff4',
    actorLineColor: '#88c0d0',
    signalColor: '#81a1c1',
    signalTextColor: '#eceff4'
  },
  paper: {
    darkMode: false,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    background: '#ffffff',
    mainBkg: '#f6f8fa',
    primaryColor: '#0969da',
    primaryTextColor: '#1f2328',
    primaryBorderColor: '#0969da',
    lineColor: '#0969da',
    secondaryColor: '#8250df',
    secondaryTextColor: '#ffffff',
    secondaryBorderColor: '#8250df',
    tertiaryColor: '#eaeef2',
    tertiaryTextColor: '#1f2328',
    tertiaryBorderColor: '#d0d7de',
    nodeBorder: '#0969da',
    nodeTextColor: '#1f2328',
    textColor: '#1f2328',
    titleColor: '#0969da',
    actorBkg: '#0969da',
    actorBorder: '#0969da',
    actorTextColor: '#ffffff',
    actorLineColor: '#0969da',
    signalColor: '#0969da',
    signalTextColor: '#1f2328',
    labelBoxBkgColor: '#f6f8fa',
    labelBoxBorderColor: '#d0d7de',
    labelTextColor: '#1f2328'
  }
};

function changeMermaidTheme(idx, theme) {
  currentMermaidThemes[idx] = theme;
  var vp = document.getElementById('mermaid-vp-' + idx);
  if (vp) vp.setAttribute('data-theme', theme);
  renderSingleMermaid(idx);
}

var mermaidInitialized = false;
function initMermaidConfig() {
  if (mermaidInitialized || typeof mermaid === 'undefined') return;
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        darkMode: true,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        background: '#0d1117',
        mainBkg: '#161b22',
        primaryColor: '#1f6feb',
        primaryTextColor: '#f0f6fc',
        primaryBorderColor: '#58a6ff',
        lineColor: '#58a6ff',
        secondaryColor: '#823afd',
        secondaryTextColor: '#ffffff',
        secondaryBorderColor: '#a060ff',
        tertiaryColor: '#161b22',
        tertiaryTextColor: '#f0f6fc',
        tertiaryBorderColor: '#30363d',
        nodeBorder: '#58a6ff',
        nodeTextColor: '#f0f6fc',
        textColor: '#f0f6fc',
        titleColor: '#58a6ff',
        mindmapSection1Bg: '#1f6feb',
        mindmapSection1Text: '#ffffff',
        mindmapSection2Bg: '#823afd',
        mindmapSection2Text: '#ffffff',
        mindmapSection3Bg: '#fc2d79',
        mindmapSection3Text: '#ffffff',
        mindmapSection4Bg: '#fd5514',
        mindmapSection4Text: '#ffffff',
        mindmapSection5Bg: '#238636',
        mindmapSection5Text: '#ffffff',
        mindmapRootBg: '#238636',
        mindmapRootText: '#ffffff',
        pie1: '#58a6ff',
        pie2: '#823afd',
        pie3: '#fc2d79',
        pie4: '#fd5514',
        pie5: '#3fb950',
        pie6: '#d29922',
        pie7: '#f0883e',
        pieTitleTextColor: '#f0f6fc',
        pieSectionTextColor: '#ffffff',
        pieLegendTextColor: '#f0f6fc',
        pieStrokeColor: '#161b22',
        timelineSection1Bg: '#1f6feb',
        timelineSection2Bg: '#823afd',
        timelineSection3Bg: '#fc2d79',
        timelineSection4Bg: '#fd5514',
        timelineEventBkg: '#21262d',
        timelineEventBorder: '#58a6ff',
        timelineEventTextColor: '#f0f6fc',
        timelineTaskBkg: '#161b22',
        timelineTaskBorder: '#30363d',
        timelineTaskTextColor: '#f0f6fc',
        timelineTaskPeriodTextColor: '#8b949e',
        quadrant1Fill: 'rgba(31, 111, 235, 0.22)',
        quadrant2Fill: 'rgba(130, 58, 253, 0.22)',
        quadrant3Fill: 'rgba(252, 45, 121, 0.22)',
        quadrant4Fill: 'rgba(253, 85, 20, 0.22)',
        quadrant1TextFill: '#79c0ff',
        quadrant2TextFill: '#d2a8ff',
        quadrant3TextFill: '#ff7b72',
        quadrant4TextFill: '#ffa657',
        quadrantPointFill: '#ffffff',
        quadrantPointTextFill: '#f0f6fc',
        quadrantXAxisTextFill: '#8b949e',
        quadrantYAxisTextFill: '#8b949e',
        quadrantTitleFill: '#f0f6fc',
        gridColor: '#30363d',
        todayLineColor: '#fc2d79',
        sectionBkgColor: '#161b22',
        sectionBkgColor2: '#0d1117',
        altSectionBkgColor: '#161b22',
        taskBorderColor: '#58a6ff',
        taskBkgColor: '#1f6feb',
        taskTextColor: '#ffffff',
        taskTextLightColor: '#ffffff',
        taskTextOutsideColor: '#f0f6fc',
        activeTaskBorderColor: '#a060ff',
        activeTaskBkgColor: '#823afd',
        doneTaskBkgColor: '#238636',
        doneTaskBorderColor: '#2ea043'
      }
    });
    mermaidInitialized = true;
  } catch(e) {
    console.error('Mermaid init error:', e);
  }
}

function renderSingleMermaid(idx) {
  var m = typeof mermaid !== 'undefined' ? mermaid : (typeof window !== 'undefined' && window.mermaid ? window.mermaid : (typeof globalThis !== 'undefined' && globalThis.mermaid ? globalThis.mermaid : null));
  if (!m) return;
  var theme = currentMermaidThemes[idx] || 'dark';
  var themeConfig = MERMAID_THEMES[theme] || MERMAID_THEMES.dark;
  var raw = originalMermaidTexts[idx];
  if (!raw) return;

  var content = document.getElementById('mermaid-content-' + idx);
  if (!content) return;
  
  var svgId = 'mermaid-svg-' + idx + '-' + Date.now();
  try {
    m.initialize({
      startOnLoad: false,
      theme: theme === 'paper' ? 'default' : 'base',
      themeVariables: themeConfig
    });
    m.render(svgId, raw.trim()).then(function(result) {
      content.innerHTML = result.svg;
    }).catch(function(err) {
      console.error('Mermaid render error:', err);
      content.innerHTML = '<div style="color: #ff7b72; padding: 1rem; font-family: monospace; font-size: 12px; background: rgba(255,123,114,0.1); border-radius: 6px;">⚠️ Diagram Render Error: ' + (err.message || err) + '</div>';
    });
  } catch(e) {
    console.error(e);
  }
}

function renderMermaidDiagrams() {
  if (typeof mermaid === 'undefined') {
    if (typeof __esbuild_esm_mermaid_nm !== 'undefined' && __esbuild_esm_mermaid_nm.mermaid) {
      window.mermaid = __esbuild_esm_mermaid_nm.mermaid.default || __esbuild_esm_mermaid_nm.mermaid;
    } else if (typeof globalThis !== 'undefined' && globalThis.mermaid) {
      window.mermaid = globalThis.mermaid;
    }
  }
  var m = typeof mermaid !== 'undefined' ? mermaid : (typeof window !== 'undefined' && window.mermaid ? window.mermaid : null);
  if (!m) {
    console.error('Mermaid library not loaded correctly.');
    var pv = document.getElementById('pv');
    if (pv) {
      var mermaidCodes = pv.querySelectorAll('code.language-mermaid');
      mermaidCodes.forEach(function(code) {
        var pre = code.closest('pre');
        if (pre) {
          pre.insertAdjacentHTML('beforebegin', '<div style="color: #ff7b72; padding: 1rem; border: 1px solid #ff7b72; border-radius: 6px; margin: 10px 0;">⚠️ Mermaid library failed to load. <code>window.mermaid</code> is undefined.</div>');
        }
      });
    }
    return;
  }
  var pv = document.getElementById('pv');
  if (!pv) return;
  
  var mermaidCodes = pv.querySelectorAll('code.language-mermaid');
  mermaidCodes.forEach(function(code, idx) {
    var rawText = (code.innerText || code.textContent).trim();
    var pre = code.closest('pre');
    if (!pre) return;
    
    originalMermaidTexts[idx] = rawText;
    mermaidScales[idx] = 1.0;
    currentMermaidThemes[idx] = 'dark';
    
    var card = document.createElement('div');
    card.className = 'mermaid-diagram-card';
    card.id = 'mermaid-card-' + idx;
    
    var toolbar = document.createElement('div');
    toolbar.className = 'mermaid-toolbar';
    toolbar.innerHTML = `
      <div class="mermaid-toolbar-left">
        <div class="mermaid-tabs">
          <button class="mermaid-tab mermaid-tab-code" onclick="toggleMermaidView(${idx}, 'code')">📝 Code</button>
          <button class="mermaid-tab mermaid-tab-diag active" onclick="toggleMermaidView(${idx}, 'diagram')">👁️ Diagram</button>
        </div>
        <select class="mermaid-select" onchange="changeMermaidTheme(${idx}, this.value)" title="Choose Diagram Color Theme">
          <option value="dark">🌌 Deep Slate</option>
          <option value="cyberpunk">⚡ Cyberpunk Neon</option>
          <option value="dracula">🧛 Dracula Purple</option>
          <option value="emerald">🍃 Emerald Mint</option>
          <option value="sunset">🌅 Sunset Coral</option>
          <option value="nord">❄️ Nord Ice</option>
          <option value="paper">☀️ Clean Paper</option>
        </select>
      </div>
      <div class="mermaid-controls" style="display: flex;">
        <button onclick="zoomMermaid(${idx}, -0.15)" title="Zoom Out">−</button>
        <button onclick="resetMermaid(${idx})" title="Reset Zoom">↺ 100%</button>
        <button onclick="zoomMermaid(${idx}, 0.15)" title="Zoom In">+</button>
        <span class="mermaid-divider"></span>
        <button onclick="exportMermaidImage(${idx}, 'jpeg')" title="Export as JPG">📥 JPG</button>
        <button onclick="exportMermaidImage(${idx}, 'png')" title="Export as PNG">📥 PNG</button>
      </div>
    `;
    
    var codeView = document.createElement('pre');
    codeView.className = 'mermaid-code-view';
    codeView.id = 'mermaid-code-' + idx;
    codeView.textContent = rawText;
    codeView.style.display = 'none'; // Default hidden as diagram is shown first
    
    var viewport = document.createElement('div');
    viewport.className = 'mermaid-viewport';
    viewport.id = 'mermaid-vp-' + idx;
    viewport.style.display = 'flex'; // Default shown
    viewport.addEventListener('wheel', function(e) {
      handleMermaidWheel(e, idx);
    }, { passive: false });
    attachMermaidPan(viewport);
    
    var content = document.createElement('div');
    content.className = 'mermaid-content';
    content.id = 'mermaid-content-' + idx;
    content.style.transform = 'scale(1.0)';
    
    viewport.appendChild(content);
    card.appendChild(toolbar);
    card.appendChild(codeView);
    card.appendChild(viewport);
    
    var parentWrapper = pre.closest('.code-block-wrapper') || pre;
    parentWrapper.parentNode.insertBefore(card, parentWrapper);
    parentWrapper.style.display = 'none';

    renderSingleMermaid(idx);
  });
}

// 🔍 Interactive Diagram Functions
function zoomMermaid(idx, step) {
  var scale = mermaidScales[idx] || 1.0;
  scale += step;
  if (scale < 0.2) scale = 0.2;
  if (scale > 5.0) scale = 5.0;
  mermaidScales[idx] = scale;
  var content = document.getElementById('mermaid-content-' + idx);
  if (content) {
    content.style.transform = 'scale(' + scale + ')';
    content.style.transformOrigin = 'center center';
  }
}

function resetMermaid(idx) {
  mermaidScales[idx] = 1.0;
  var content = document.getElementById('mermaid-content-' + idx);
  if (content) {
    content.style.transform = 'scale(1.0)';
    content.style.left = '0px';
    content.style.top = '0px';
  }
}

function handleMermaidWheel(e, idx) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    var step = e.deltaY < 0 ? 0.15 : -0.15;
    zoomMermaid(idx, step);
  }
}

function attachMermaidPan(viewport) {
  var isPanning = false;
  var startX = 0, startY = 0;
  var contentX = 0, contentY = 0;

  viewport.addEventListener('mousedown', function(e) {
    var content = viewport.querySelector('.mermaid-content');
    if (!content) return;
    if (e.button !== 0) return; // Only left click
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    var style = window.getComputedStyle(content);
    var left = parseInt(style.left) || 0;
    var top = parseInt(style.top) || 0;
    contentX = left;
    contentY = top;
    viewport.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', function(e) {
    var content = viewport.querySelector('.mermaid-content');
    if (!isPanning || !content) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    content.style.position = 'relative';
    content.style.left = (contentX + dx) + 'px';
    content.style.top = (contentY + dy) + 'px';
  });

  window.addEventListener('mouseup', function() {
    isPanning = false;
    viewport.style.cursor = 'grab';
  });
  
  viewport.style.cursor = 'grab';
  viewport.style.overflow = 'hidden';
}

function toggleMermaidView(idx, view) {
  var codeView = document.getElementById('mermaid-code-' + idx);
  var vp = document.getElementById('mermaid-vp-' + idx);
  var card = document.getElementById('mermaid-card-' + idx);
  if (!codeView || !vp || !card) return;
  
  var btnCode = card.querySelector('.mermaid-tab-code');
  var btnDiag = card.querySelector('.mermaid-tab-diag');
  
  if (view === 'code') {
    codeView.style.display = 'block';
    vp.style.display = 'none';
    if (btnCode) btnCode.classList.add('active');
    if (btnDiag) btnDiag.classList.remove('active');
  } else {
    codeView.style.display = 'none';
    vp.style.display = 'flex';
    if (btnCode) btnCode.classList.remove('active');
    if (btnDiag) btnDiag.classList.add('active');
  }
}

// 📑 5. TSV Excel-like Interactive Spreadsheet Engine
var tsvStates = {};

function initTsvInteractiveTable(idx, table, card) {
  tsvStates[idx] = {
    selected: new Set(),
    activeCell: null,
    anchorCell: null,
    isSelecting: false
  };

  var state = tsvStates[idx];

  function clearSelection() {
    state.selected.clear();
    table.querySelectorAll('.cell-selected, .cell-active').forEach(function(el) {
      el.classList.remove('cell-selected', 'cell-active');
    });
    table.querySelectorAll('.col-selected').forEach(function(el) {
      el.classList.remove('col-selected');
    });
    table.querySelectorAll('.row-selected').forEach(function(el) {
      el.classList.remove('row-selected');
    });
  }

  function selectCell(r, c, isAdd) {
    var cell = table.querySelector('td[data-row="' + r + '"][data-col="' + c + '"]');
    if (!cell) return;
    var key = r + ',' + c;
    if (isAdd) {
      if (state.selected.has(key)) {
        state.selected.delete(key);
        cell.classList.remove('cell-selected');
      } else {
        state.selected.add(key);
        cell.classList.add('cell-selected');
      }
    } else {
      state.selected.add(key);
      cell.classList.add('cell-selected');
    }
  }

  function selectRange(r1, c1, r2, c2) {
    clearSelection();
    var minR = Math.min(r1, r2);
    var maxR = Math.max(r1, r2);
    var minC = Math.min(c1, c2);
    var maxC = Math.max(c1, c2);

    for (var r = minR; r <= maxR; r++) {
      for (var c = minC; c <= maxC; c++) {
        selectCell(r, c, false);
      }
    }
  }

  // Mouse Selection
  table.addEventListener('mousedown', function(e) {
    var td = e.target.closest('td[data-row][data-col]');
    if (td) {
      var r = parseInt(td.getAttribute('data-row'));
      var c = parseInt(td.getAttribute('data-col'));

      if (e.shiftKey && state.anchorCell) {
        e.preventDefault();
        selectRange(state.anchorCell.r, state.anchorCell.c, r, c);
      } else if (e.ctrlKey || e.metaKey) {
        selectCell(r, c, true);
        state.anchorCell = { r: r, c: c };
      } else {
        clearSelection();
        state.isSelecting = true;
        state.anchorCell = { r: r, c: c };
        state.activeCell = { r: r, c: c };
        selectCell(r, c, false);
        td.classList.add('cell-active');
      }
    }
  });

  table.addEventListener('mouseover', function(e) {
    if (!state.isSelecting || !state.anchorCell) return;
    var td = e.target.closest('td[data-row][data-col]');
    if (td) {
      window.getSelection().removeAllRanges();
      var r = parseInt(td.getAttribute('data-row'));
      var c = parseInt(td.getAttribute('data-col'));
      selectRange(state.anchorCell.r, state.anchorCell.c, r, c);
      var anchorEl = table.querySelector('td[data-row="' + state.anchorCell.r + '"][data-col="' + state.anchorCell.c + '"]');
      if (anchorEl) anchorEl.classList.add('cell-active');
    }
  });

  window.addEventListener('mouseup', function() {
    state.isSelecting = false;
  });

  // Row & Column Header Selection
  table.addEventListener('click', function(e) {
    var rowIdxEl = e.target.closest('.tsv-row-idx[data-row]');
    if (rowIdxEl) {
      var r = parseInt(rowIdxEl.getAttribute('data-row'));
      if (!e.ctrlKey && !e.shiftKey) clearSelection();
      rowIdxEl.classList.add('row-selected');
      var rowTds = table.querySelectorAll('td[data-row="' + r + '"][data-col]');
      rowTds.forEach(function(td) {
        var c = parseInt(td.getAttribute('data-col'));
        selectCell(r, c, false);
      });
      state.anchorCell = { r: r, c: 0 };
    }

    var th = e.target.closest('th[data-col]');
    if (th) {
      var c = parseInt(th.getAttribute('data-col'));
      if (!e.ctrlKey && !e.shiftKey) clearSelection();
      th.classList.add('col-selected');
      var colTds = table.querySelectorAll('td[data-col="' + c + '"]');
      colTds.forEach(function(td) {
        var r = parseInt(td.getAttribute('data-row'));
        selectCell(r, c, false);
      });
      state.anchorCell = { r: 0, c: c };
    }
  });
}

// 📋 Shared TSV Copy Helper (DRY)
function copySelectedCells(idx, state, clipboardEvent) {
  var table = document.getElementById('tsv-table-' + idx);
  if (!table) return false;

  var selectedCoords = Array.from(state.selected).map(function(k) {
    var parts = k.split(',');
    return { r: parseInt(parts[0]), c: parseInt(parts[1]) };
  });
  if (selectedCoords.length === 0) return false;

  var minR = Math.min.apply(null, selectedCoords.map(function(x) { return x.r; }));
  var maxR = Math.max.apply(null, selectedCoords.map(function(x) { return x.r; }));
  var minC = Math.min.apply(null, selectedCoords.map(function(x) { return x.c; }));
  var maxC = Math.max.apply(null, selectedCoords.map(function(x) { return x.c; }));

  var tsvRows = [];
  for (var r = minR; r <= maxR; r++) {
    var rowCells = [];
    for (var c = minC; c <= maxC; c++) {
      var td = table.querySelector('td[data-row="' + r + '"][data-col="' + c + '"]');
      rowCells.push(td ? td.innerText.replace(/\t/g, ' ').trim() : '');
    }
    tsvRows.push(rowCells.join('\t'));
  }
  var tsvText = tsvRows.join('\n');

  if (clipboardEvent && clipboardEvent.clipboardData) {
    clipboardEvent.preventDefault();
    clipboardEvent.clipboardData.setData('text/plain', tsvText);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tsvText).catch(function() {});
  }

  var card = document.getElementById('tsv-card-' + idx);
  if (card) {
    var btn = card.querySelector('.tsv-sheet-btn');
    if (btn) {
      var originalText = btn.innerHTML;
      btn.innerHTML = '✓ Copied ' + state.selected.size + ' Cells!';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.innerHTML = originalText;
        btn.classList.remove('copied');
      }, 1500);
    }
  }
  return true;
}

// 📋 Global Copy & Excel Hotkeys (Ctrl+C, Ctrl+V, Delete)
document.addEventListener('copy', function(e) {
  for (var idx in tsvStates) {
    var state = tsvStates[idx];
    if (state && state.selected && state.selected.size > 0) {
      if (copySelectedCells(idx, state, e)) return;
    }
  }
});

document.addEventListener('keydown', function(e) {
  for (var idx in tsvStates) {
    var state = tsvStates[idx];
    if (!state) continue;
    var table = document.getElementById('tsv-table-' + idx);
    if (!table) continue;

    var isCtrl = e.ctrlKey || e.metaKey;
    var isKeyC = e.code === 'KeyC';
    var isKeyV = e.code === 'KeyV';
    var isKeyA = e.code === 'KeyA';
    var isDelete = e.code === 'Delete' || e.code === 'Backspace';

    // Ctrl + A (Select All Cells in Current TSV Table)
    if (isCtrl && isKeyA && (state.selected.size > 0 || state.anchorCell)) {
      e.preventDefault();
      table.querySelectorAll('td[data-row][data-col]').forEach(function(td) {
        var r = parseInt(td.getAttribute('data-row'));
        var c = parseInt(td.getAttribute('data-col'));
        var key = r + ',' + c;
        state.selected.add(key);
        td.classList.add('cell-selected');
      });
      return;
    }

    // Ctrl + C (Language-Independent via e.code)
    if (isCtrl && isKeyC && state.selected && state.selected.size > 0) {
      e.preventDefault();
      if (copySelectedCells(idx, state, null)) return;
    }

    // Ctrl + V Paste (Language-Independent via e.code === 'KeyV')
    if (isCtrl && isKeyV && state.anchorCell) {
      navigator.clipboard.readText().then(function(clipText) {
        if (!clipText) return;
        var pasteRows = clipText.split(/\r?\n/).filter(function(l) { return l.length > 0; });
        var startR = state.anchorCell.r;
        var startC = state.anchorCell.c;

        pasteRows.forEach(function(line, rOff) {
          var targetR = startR + rOff;
          while (!table.querySelector('td[data-row="' + targetR + '"]')) {
            addTsvRow(idx);
          }
          var delimiter = line.indexOf('\t') >= 0 ? '\t' : ',';
          var vals = line.split(delimiter);
          vals.forEach(function(val, cOff) {
            var targetC = startC + cOff;
            var targetTd = table.querySelector('td[data-row="' + targetR + '"][data-col="' + targetC + '"]');
            if (targetTd) {
              targetTd.innerText = val.trim();
              var key = targetR + ',' + targetC;
              state.selected.add(key);
              targetTd.classList.add('cell-selected');
            }
          });
        });
      }).catch(function(err) {
        console.error('Clipboard paste error: ', err);
      });
      return;
    }

    // Delete or Backspace
    if (isDelete && state.selected && state.selected.size > 0 && !e.target.isContentEditable) {
      e.preventDefault();
      state.selected.forEach(function(k) {
        var parts = k.split(',');
        var td = table.querySelector('td[data-row="' + parts[0] + '"][data-col="' + parts[1] + '"]');
        if (td) td.innerText = '';
      });
    }
  }
});

function renderTsvSpreadsheets() {
  var pv = document.getElementById('pv');
  if (!pv) return;
  
  var tsvCodes = pv.querySelectorAll('code.language-tsv, code.language-csv');
  tsvCodes.forEach(function(code, idx) {
    var rawText = (code.innerText || code.textContent).trim();
    var pre = code.closest('pre');
    if (!pre) return;
    
    var delimiter = code.className.includes('language-csv') ? ',' : '\t';
    var lines = rawText.split(/\r?\n/).filter(function(l) { return l.trim().length > 0; });
    if (lines.length === 0) return;
    
    var card = document.createElement('div');
    card.className = 'tsv-sheet-card';
    card.id = 'tsv-card-' + idx;
    
    var headerRow = lines[0].split(delimiter);
    var bodyRows = lines.slice(1);
    
    var thHtml = '<th class="tsv-row-idx">#</th>' + headerRow.map(function(h, cIdx) {
      return '<th contenteditable="true" data-col="' + cIdx + '" title="Click to select column">' + h.trim() + '</th>';
    }).join('');
    
    var trHtml = '';
    bodyRows.forEach(function(line, rIdx) {
      var cells = line.split(delimiter);
      trHtml += '<tr><td class="tsv-row-idx" data-row="' + rIdx + '" title="Click to select row">' + (rIdx + 1) + '</td>';
      for (var c = 0; c < headerRow.length; c++) {
        var cellVal = (cells[c] !== undefined ? cells[c].trim() : '');
        trHtml += '<td contenteditable="true" data-row="' + rIdx + '" data-col="' + c + '">' + cellVal + '</td>';
      }
      trHtml += '</tr>';
    });
    
    card.innerHTML = `
      <div class="tsv-sheet-toolbar">
        <span class="tsv-sheet-title">📊 SPREADSHEET (${bodyRows.length} Rows — Excel Hotkeys: Ctrl+C / Ctrl+V / Multi-Select)</span>
        <div class="tsv-sheet-controls">
          <button class="tsv-sheet-btn" onclick="saveTsvToFile(${idx}, this)" title="Save edits directly to markdown file">💾 Save File</button>
          <button class="tsv-sheet-btn" onclick="addTsvRow(${idx})">➕ Add Row</button>
          <button class="tsv-sheet-btn" onclick="copyTsvData(${idx}, this)">📋 Copy TSV</button>
          <button class="tsv-sheet-btn" onclick="exportTsvDataFile(${idx}, 'tsv')" title="Export as TSV file">📥 TSV</button>
          <button class="tsv-sheet-btn" onclick="exportTsvImage(${idx}, 'jpeg')" title="Export as JPG">📥 JPG</button>
          <button class="tsv-sheet-btn" onclick="exportTsvImage(${idx}, 'png')" title="Export as PNG">📥 PNG</button>
        </div>
      </div>
      <div class="tsv-table-container">
        <table class="tsv-table" id="tsv-table-${idx}">
          <thead><tr>${thHtml}</tr></thead>
          <tbody>${trHtml}</tbody>
        </table>
      </div>
    `;
    
    var parentWrapper = pre.closest('.code-block-wrapper') || pre;
    parentWrapper.parentNode.insertBefore(card, parentWrapper);
    parentWrapper.style.display = 'none';

    var table = card.querySelector('table');
    initTsvInteractiveTable(idx, table, card);
  });
}

function addTsvRow(idx) {
  var table = document.getElementById('tsv-table-' + idx);
  if (!table) return;
  var tbody = table.querySelector('tbody');
  var headerCount = table.querySelectorAll('thead th:not(.tsv-row-idx)').length;
  var rowIdx = tbody.querySelectorAll('tr').length;
  
  var tr = document.createElement('tr');
  var html = '<td class="tsv-row-idx" data-row="' + rowIdx + '" title="Click to select row">' + (rowIdx + 1) + '</td>';
  for (var i = 0; i < headerCount; i++) {
    html += '<td contenteditable="true" data-row="' + rowIdx + '" data-col="' + i + '"></td>';
  }
  tr.innerHTML = html;
  tbody.appendChild(tr);
}

function getTableTsvString(idx) {
  var table = document.getElementById('tsv-table-' + idx);
  if (!table) return '';
  
  var tsvOutput = [];
  var rows = table.querySelectorAll('tr');
  rows.forEach(function(row) {
    var cells = row.querySelectorAll('th:not(.tsv-row-idx), td:not(.tsv-row-idx)');
    var rowData = [];
    cells.forEach(function(cell) {
      rowData.push(cell.innerText.replace(/\t/g, ' ').trim());
    });
    if (rowData.length > 0) {
      tsvOutput.push(rowData.join('\t'));
    }
  });
  return tsvOutput.join('\n');
}

function saveTsvToFile(idx, btn) {
  var tsvContent = getTableTsvString(idx);
  if (typeof vscodeApi !== 'undefined') {
    vscodeApi.postMessage({
      command: 'saveTsv',
      tableIndex: idx,
      tsvContent: tsvContent
    });
    if (btn) {
      var origText = btn.innerHTML;
      btn.innerHTML = '✓ Saved!';
      btn.classList.add('saved');
      setTimeout(function() {
        btn.innerHTML = origText;
        btn.classList.remove('saved');
      }, 1800);
    }
  }
}

function exportTsvDataFile(idx, format) {
  var tsvContent = getTableTsvString(idx);
  var ext = format || 'tsv';
  var filename = 'table-' + (idx + 1) + '.' + ext;
  if (typeof vscodeApi !== 'undefined') {
    vscodeApi.postMessage({
      command: 'exportDataFile',
      content: tsvContent,
      filename: filename
    });
  }
}

function copyTsvData(idx, btn) {
  var table = document.getElementById('tsv-table-' + idx);
  if (!table) return;
  
  var tsvOutput = getTableTsvString(idx);
  
  navigator.clipboard.writeText(tsvOutput).then(function() {
    btn.innerHTML = '✓ Copied TSV!';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.innerHTML = '📋 Copy TSV';
      btn.classList.remove('copied');
    }, 1800);
  });
}

// 📥 Export Mermaid Diagram as Image (JPG/PNG)
function exportMermaidImage(idx, format) {
  var content = document.getElementById('mermaid-content-' + idx);
  if (!content) return;
  var svg = content.querySelector('svg');
  if (!svg) { alert('No diagram to export. Switch to Diagram view first.'); return; }

  var svgClone = svg.cloneNode(true);
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Inline computed styles for standalone rendering
  var allEls = svgClone.querySelectorAll('*');
  var origEls = svg.querySelectorAll('*');
  for (var i = 0; i < Math.min(allEls.length, origEls.length); i++) {
    var cs = window.getComputedStyle(origEls[i]);
    var important = ['fill','stroke','stroke-width','font-family','font-size','font-weight','opacity','color','text-anchor','dominant-baseline'];
    important.forEach(function(prop) {
      var val = cs.getPropertyValue(prop);
      if (val) allEls[i].style.setProperty(prop, val);
    });
  }

  var bbox = svg.getBoundingClientRect();
  var scale = parseInt(drviewSettings.exportScale) || 2;
  var w = Math.max(bbox.width, 200) * scale;
  var h = Math.max(bbox.height, 200) * scale;

  svgClone.setAttribute('width', w);
  svgClone.setAttribute('height', h);

  // Background color handling
  var bg = drviewSettings.mermaidExportBg;
  var bgColor = '#ffffff';
  if (bg === 'dark') bgColor = '#0d1117';
  if (bg === 'transparent' && format === 'png') bgColor = null;

  var serializer = new XMLSerializer();
  var svgString = serializer.serializeToString(svgClone);
  var svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  var URL = window.URL || window.webkitURL || window;
  var svgUrl = URL.createObjectURL(svgBlob);

  var img = new Image();
  img.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');

    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(svgUrl);

    var mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    var dataUrl = canvas.toDataURL(mimeType, 0.95);
    var filename = 'mermaid-diagram-' + (idx + 1) + '.' + (format === 'png' ? 'png' : 'jpg');

    if (typeof vscodeApi !== 'undefined') {
      vscodeApi.postMessage({ command: 'saveImage', dataUrl: dataUrl, filename: filename });
    } else {
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  img.onerror = function() { alert('Failed to render diagram for export.'); };
  img.src = svgUrl;
}

// 📥 Export TSV Table as Image (JPG/PNG)
function exportTsvImage(idx, format) {
  var table = document.getElementById('tsv-table-' + idx);
  if (!table) return;

  var isDark = drviewSettings.tsvExportBg === 'dark';
  var bg = isDark ? '#0d1117' : '#ffffff';
  var textColor = isDark ? '#e6edf3' : '#1f2328';
  var headerBg = isDark ? '#161b22' : '#f6f8fa';
  var headerColor = isDark ? '#58a6ff' : '#0969da';
  var borderColor = isDark ? '#30363d' : '#d0d7de';

  var rows = table.querySelectorAll('tr');
  var tableHtml = '<table style="border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:' + textColor + ';">';
  rows.forEach(function(row) {
    tableHtml += '<tr>';
    row.querySelectorAll('th, td').forEach(function(cell) {
      var isHeader = cell.tagName === 'TH';
      var isRowIdx = cell.classList.contains('tsv-row-idx');
      var cellBg = (isHeader || isRowIdx) ? headerBg : bg;
      var cellColor = isHeader ? headerColor : textColor;
      var fw = isHeader ? '600' : '400';
      var pad = '8px 12px';
      var align = isRowIdx ? 'center' : 'left';
      
      var cellText = cell.innerText.replace(/[<>&'"]/g, function(c) {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
      
      tableHtml += '<' + cell.tagName.toLowerCase() + ' style="background:' + cellBg + ';color:' + cellColor + ';border:1px solid ' + borderColor + ';padding:' + pad + ';font-weight:' + fw + ';text-align:' + align + ';white-space:pre-wrap;word-break:break-word;">' + cellText + '</' + cell.tagName.toLowerCase() + '>';
    });
    tableHtml += '</tr>';
  });
  tableHtml += '</table>';

  var foreignHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="__W__" height="__H__"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="background:' + bg + ';padding:16px;">' + tableHtml + '</div></foreignObject></svg>';

  // Pre-measure: render offscreen to get dimensions
  var measurer = document.createElement('div');
  measurer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
  measurer.innerHTML = '<div style="background:' + bg + ';padding:16px;display:inline-block;">' + tableHtml + '</div>';
  document.body.appendChild(measurer);
  var mRect = measurer.firstChild.getBoundingClientRect();
  var w = Math.ceil(mRect.width) + 4;
  var h = Math.ceil(mRect.height) + 4;
  document.body.removeChild(measurer);

  var scale = parseInt(drviewSettings.exportScale) || 2;
  var finalSvg = foreignHtml.replace('__W__', w).replace('__H__', h);
  var svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(finalSvg);

  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);

    var mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    var ext = format === 'png' ? '.png' : '.jpg';
    var dataUrl = canvas.toDataURL(mimeType, 0.95);
    var filename = 'drview-table-' + idx + '-' + Date.now() + ext;
    
    if (typeof vscodeApi !== 'undefined') {
      vscodeApi.postMessage({ command: 'saveImage', dataUrl: dataUrl, filename: filename });
    } else {
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  img.onerror = function() { alert('Failed to render table for export.'); };
  img.src = svgUrl;
}

// Bind scroll events & interactive link handlers
function initViewer() {
  try { loadSettings(); } catch(e) { console.error('loadSettings error:', e); }
  
  var pv = document.getElementById('pv');
  if (pv) {
    // Restore scroll position when tab is restored
    if (typeof vscodeApi !== 'undefined') {
      try {
        var state = vscodeApi.getState();
        if (state && typeof state.scrollTop === 'number') {
          pv.scrollTop = state.scrollTop;
        }
      } catch(e){}
    }

    pv.addEventListener('scroll', function() {
      updateReadingProgress();
      updateScrollSpy();
      if (typeof vscodeApi !== 'undefined') {
        try {
          vscodeApi.setState({ scrollTop: pv.scrollTop });
        } catch(e){}
      }
    });

    // Intercept links for external URLs and internal Markdown files
    pv.addEventListener('click', function(e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#')) return; // Allow internal hash anchors
      
      e.preventDefault();
      if (typeof vscodeApi !== 'undefined') {
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
          vscodeApi.postMessage({ command: 'openExternal', url: href });
        } else {
          vscodeApi.postMessage({ command: 'openFile', filePath: href });
        }
      }
    });
  }
  
  try { buildOutline(); } catch(e) { console.error('buildOutline error:', e); }
  try { renderMermaidDiagrams(); } catch(e) { console.error('renderMermaid error:', e); }
  try { renderTsvSpreadsheets(); } catch(e) { console.error('renderTsv error:', e); }
  try { enhanceCodeBlocks(); } catch(e) { console.error('enhanceCodeBlocks error:', e); }
  try { updateReadingProgress(); } catch(e) { console.error('updateReadingProgress error:', e); }
  try { applyAllSettings(); } catch(e) { console.error('applyAllSettings error:', e); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initViewer);
} else {
  initViewer();
}

