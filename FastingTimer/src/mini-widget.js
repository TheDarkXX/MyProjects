// src/mini-widget.js
// 1:1 Living Ring Desktop Sentinel Controller — Pure Frameless HUD with Hover Overlays

document.addEventListener('DOMContentLoaded', () => {
  const api = window.fastingAPI;
  if (!api) {
    console.error('fastingAPI not available');
    return;
  }

  // ════ DOM Elements ════
  const hudContainer = document.getElementById('hudContainer');
  const tabFasting = document.getElementById('tabFasting');
  const tabKitchen = document.getElementById('tabKitchen');
  const bottomFastingPanel = document.getElementById('bottomFastingPanel');
  const bottomKitchenPanel = document.getElementById('bottomKitchenPanel');
  const btnPin = document.getElementById('btnPin');
  const btnExpand = document.getElementById('btnExpand');
  const btnClose = document.getElementById('btnClose');
  const syncDot = document.getElementById('syncDot');

  // Ring HUD Elements
  const particleCanvas = document.getElementById('particleCanvas');
  const ringActiveArc = document.getElementById('ringActiveArc');
  const ambientCorona = document.getElementById('ambientCorona');
  const centerStageOrb = document.getElementById('centerStageOrb');
  const orbGlassInner = document.getElementById('orbGlassInner');
  const orbIcon = document.getElementById('orbIcon');
  const stateBadge = document.getElementById('stateBadge');
  const mainClock = document.getElementById('mainClock');
  const clockSubtitle = document.getElementById('clockSubtitle');
  const stagePill = document.getElementById('stagePill');
  const stageDot = document.getElementById('stageDot');
  const stageName = document.getElementById('stageName');

  // Fasting Action Buttons
  const btnFastingToggle = document.getElementById('btnFastingToggle');
  const btnAdjustMinus = document.getElementById('btnAdjustMinus');
  const btnAdjustPlus = document.getElementById('btnAdjustPlus');

  // Kitchen Action Buttons & Presets
  const btnKitchenToggle = document.getElementById('btnKitchenToggle');
  const btnKitchenReset = document.getElementById('btnKitchenReset');
  const btnKitchenAddTwo = document.getElementById('btnKitchenAddTwo');
  const presetPills = document.querySelectorAll('.preset-pill');

  // Constants
  // SVG Circle radius r=92 -> Circumference = 2 * PI * 92 = 578.05
  const RING_CIRCUMFERENCE = 578.05;

  let activeMode = 'fasting'; // 'fasting' | 'kitchen'
  let currentFastingState = null;
  let currentKitchenState = null;
  let isWindowFocused = true;

  // Window Focus Detection for 60fps / 20fps Adaptive Particle Throttle
  window.addEventListener('focus', () => { isWindowFocused = true; });
  window.addEventListener('blur', () => { isWindowFocused = false; });
  document.addEventListener('visibilitychange', () => {
    isWindowFocused = !document.hidden;
  });

  // ═════════════════════════════════════════════════════════
  // 1. DYNAMIC LIVING FLAME & ORBITING STARDUST CANVAS ENGINE
  // ═════════════════════════════════════════════════════════
  const ctx = particleCanvas.getContext('2d');
  const CX = 120;
  const CY = 120;
  const RING_RADIUS = 92;

  // Particle Class 1: Core Flame Embers (Rising from stage orb)
  class FlameEmber {
    constructor(color) {
      this.reset(color);
    }
    reset(color) {
      this.x = CX + (Math.random() - 0.5) * 32;
      this.y = CY - 18 + (Math.random() - 0.5) * 16;
      this.radius = 1.8 + Math.random() * 3.6;
      this.alpha = 0.7 + Math.random() * 0.3;
      this.speedY = 0.6 + Math.random() * 1.5;
      this.speedX = (Math.random() - 0.5) * 1.0;
      this.color = color || '#10b981';
      this.decay = 0.015 + Math.random() * 0.02;
    }
    update(color) {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.alpha -= this.decay;
      this.radius = Math.max(0.5, this.radius * 0.98);
      if (this.alpha <= 0 || this.y < 20) this.reset(color);
    }
    draw(targetCtx) {
      targetCtx.save();
      targetCtx.globalAlpha = Math.max(0, this.alpha);
      targetCtx.beginPath();
      targetCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      targetCtx.fillStyle = this.color;
      targetCtx.shadowColor = this.color;
      targetCtx.shadowBlur = 8;
      targetCtx.fill();
      targetCtx.restore();
    }
  }

  // Particle Class 2: Orbiting Stardust (Swirling along the living ring arc)
  class OrbitingStardust {
    constructor() {
      this.angle = Math.random() * Math.PI * 2;
      this.dist = RING_RADIUS + (Math.random() - 0.5) * 18;
      this.angularSpeed = 0.008 + Math.random() * 0.012;
      this.radius = 1.2 + Math.random() * 2.2;
      this.alpha = 0.4 + Math.random() * 0.5;
      this.color = '#38bdf8';
    }
    update(color, progressAngle) {
      this.angle += this.angularSpeed;
      if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
      this.color = color;
    }
    draw(targetCtx) {
      const px = CX + Math.cos(this.angle) * this.dist;
      const py = CY + Math.sin(this.angle) * this.dist;
      targetCtx.save();
      targetCtx.globalAlpha = this.alpha;
      targetCtx.beginPath();
      targetCtx.arc(px, py, this.radius, 0, Math.PI * 2);
      targetCtx.fillStyle = this.color;
      targetCtx.shadowColor = this.color;
      targetCtx.shadowBlur = 6;
      targetCtx.fill();
      targetCtx.restore();
    }
  }

  const flameParticles = [];
  const stardustParticles = [];
  const MAX_FLAMES = 45;
  const MAX_STARDUST = 30;

  for (let i = 0; i < MAX_FLAMES; i++) flameParticles.push(new FlameEmber('#10b981'));
  for (let i = 0; i < MAX_STARDUST; i++) stardustParticles.push(new OrbitingStardust());

  let lastFrameTime = 0;
  function renderParticles(timestamp) {
    requestAnimationFrame(renderParticles);

    // Adaptive Throttling: 20fps when blurred, 60fps when focused
    const targetFps = isWindowFocused ? 60 : 20;
    const interval = 1000 / targetFps;
    if (timestamp - lastFrameTime < interval) return;
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, 240, 240);

    let stageColor = '#10b981';
    let progressRatio = 0.3;

    if (activeMode === 'fasting' && currentFastingState) {
      if (currentFastingState.stage) stageColor = currentFastingState.stage.color || '#10b981';
      progressRatio = Math.min(1.0, (currentFastingState.elapsedSeconds || 0) / ((currentFastingState.targetHours || 16) * 3600));
    } else if (activeMode === 'kitchen' && currentKitchenState) {
      stageColor = currentKitchenState.isCompleted ? '#f43f5e' : '#38bdf8';
      progressRatio = currentKitchenState.progressPct ? (currentKitchenState.progressPct / 100) : 0;
    }

    const flameCount = isWindowFocused ? MAX_FLAMES : 15;
    for (let i = 0; i < flameCount; i++) {
      flameParticles[i].update(stageColor);
      flameParticles[i].draw(ctx);
    }

    const stardustCount = isWindowFocused ? MAX_STARDUST : 10;
    for (let i = 0; i < stardustCount; i++) {
      stardustParticles[i].update(stageColor, progressRatio * Math.PI * 2);
      stardustParticles[i].draw(ctx);
    }
  }
  requestAnimationFrame(renderParticles);

  // ═════════════════════════════════════════════════════════
  // 2. TIME FORMATTERS & RING PROGRESS UPDATER
  // ═════════════════════════════════════════════════════════
  function formatSecondsToHMS(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatSecondsToMS(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function setRingProgress(ratio, strokeGradientUrl) {
    const clampedRatio = Math.max(0.0, Math.min(1.0, ratio));
    const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * clampedRatio);
    ringActiveArc.style.strokeDashoffset = offset.toFixed(2);
    if (strokeGradientUrl) {
      ringActiveArc.style.stroke = strokeGradientUrl;
    }
  }

  // ═════════════════════════════════════════════════════════
  // 3. UI STATE UPDATER (1:1 PARITY WITH MOBILE WEB)
  // ═════════════════════════════════════════════════════════
  function updateFastingUI(state) {
    currentFastingState = state;
    if (!state || activeMode !== 'fasting') return;

    const isEating = state.isEating || state.currentStatus === 'eating' || (state.activeSession && state.activeSession.session_type === 'eating');
    const elapsed = state.elapsedSeconds || 0;
    const targetHours = state.targetHours || (isEating ? 8.0 : 16.0);
    const targetSeconds = Math.round(targetHours * 3600);
    const pct = Math.min(100, Math.round((elapsed / targetSeconds) * 100));

    // Update Digital Clock
    mainClock.textContent = formatSecondsToHMS(elapsed);
    mainClock.classList.remove('kitchen-mode');

    // Update Ring Arc Progress & Arc Color (Sunset orange for eating, vibrant gradient for fasting)
    const ratio = Math.min(1.0, elapsed / targetSeconds);
    const gradient = isEating ? 'url(#ringGradEating)' : 'url(#ringGradFasting)';
    setRingProgress(ratio, gradient);

    // Update Target Subtitle (1:1 with Web Master)
    if (isEating) {
      const remainingSec = Math.max(0, targetSeconds - elapsed);
      clockSubtitle.textContent = `Remaining Eating Time: ${formatSecondsToHMS(remainingSec)}`;
    } else {
      const targetH = Math.floor(targetHours);
      const targetM = Math.round((targetHours - targetH) * 60);
      clockSubtitle.textContent = `Target: ${targetH}h ${String(targetM).padStart(2, '0')}m (${pct}%)`;
    }

    // Update State Badge & Main Button
    if (isEating) {
      stateBadge.textContent = '🍽️ EATING WINDOW';
      stateBadge.className = 'state-badge eating';
      btnFastingToggle.textContent = '🛑 END EATING';
      btnFastingToggle.title = 'End Eating Window and Start 16:8 Fasting';
    } else {
      stateBadge.textContent = '🔥 FASTING';
      stateBadge.className = 'state-badge';
      btnFastingToggle.textContent = '🍽️ BREAK FAST';
      btnFastingToggle.title = 'Break Fast and Start Eating Window';
    }

    // Update Stage Pill and Orb
    if (state.stage) {
      const stage = state.stage;
      stageName.textContent = isEating ? 'Eating Window (Feast)' : stage.name;
      stageDot.style.background = isEating ? '#f59e0b' : stage.color;
      stageDot.style.boxShadow = `0 0 8px ${isEating ? '#f59e0b' : stage.color}`;
      orbIcon.textContent = isEating ? '🍽️' : (stage.icon || '🔥');
      
      const glowColor = isEating ? '#f59e0b' : stage.color;
      document.documentElement.style.setProperty('--current-glow', glowColor);
      centerStageOrb.style.borderColor = `${glowColor}80`;
      centerStageOrb.style.boxShadow = `0 0 16px ${glowColor}50, inset 0 2px 4px rgba(255, 255, 255, 0.35)`;
      ambientCorona.style.background = isEating
        ? `radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(6, 10, 19, 0.8) 64%, transparent 100%)`
        : `radial-gradient(circle, ${stage.color}25 0%, rgba(6, 10, 19, 0.8) 64%, transparent 100%)`;
    }

    // Update Sync Dot
    if (state.isCloudOnline) {
      syncDot.classList.remove('offline');
      syncDot.title = 'VPS Hub Synced';
    } else {
      syncDot.classList.add('offline');
      syncDot.title = 'Offline Mode (Local Clock)';
    }
  }

  function updateKitchenUI(state) {
    currentKitchenState = state;
    if (!state || activeMode !== 'kitchen') return;

    mainClock.textContent = formatSecondsToMS(state.remainingSeconds || 0);
    mainClock.classList.add('kitchen-mode');

    // Ring Arc
    const ratio = state.progressPct ? (state.progressPct / 100) : 0;
    setRingProgress(ratio, 'url(#ringGradKitchen)');

    // Subtitle & Badge
    clockSubtitle.textContent = `${state.name} (${Math.round(state.durationSeconds / 60)}m)`;
    stateBadge.textContent = '🍳 KITCHEN TIMER';
    stateBadge.className = 'state-badge kitchen';

    // Stage Pill
    if (state.isCompleted) {
      stageName.textContent = 'ALARM! COMPLETED';
      stageDot.style.background = '#f43f5e';
      orbIcon.textContent = '🔔';
      hudContainer.classList.add('pulse-alert');
      btnKitchenToggle.textContent = 'DONE';
    } else if (state.isRunning) {
      stageName.textContent = 'BOILING / RUNNING';
      stageDot.style.background = '#38bdf8';
      orbIcon.textContent = '🍳';
      hudContainer.classList.remove('pulse-alert');
      btnKitchenToggle.textContent = 'PAUSE';
    } else {
      stageName.textContent = 'READY TO START';
      stageDot.style.background = '#f59e0b';
      orbIcon.textContent = '🥚';
      hudContainer.classList.remove('pulse-alert');
      btnKitchenToggle.textContent = 'START';
    }
  }

  // ═════════════════════════════════════════════════════════
  // 4. IPC EVENT LISTENERS & INITIAL STATE
  // ═════════════════════════════════════════════════════════
  api.onFastingTick((state) => {
    if (activeMode === 'fasting') updateFastingUI(state);
  });

  api.onKitchenTick((state) => {
    if (activeMode === 'kitchen') updateKitchenUI(state);
  });

  api.onKitchenCompleted((state) => {
    if (activeMode === 'kitchen') updateKitchenUI(state);
    hudContainer.classList.add('pulse-alert');
  });

  api.onGlobalStateChanged(({ type, state }) => {
    if (type === 'fasting' && activeMode === 'fasting') updateFastingUI(state);
    if (type === 'kitchen' && activeMode === 'kitchen') updateKitchenUI(state);
  });

  // Initial Fetch
  api.getFastingState().then((state) => {
    currentFastingState = state;
    if (activeMode === 'fasting') updateFastingUI(state);
  });

  api.getKitchenState().then((state) => {
    currentKitchenState = state;
    if (activeMode === 'kitchen') updateKitchenUI(state);
  });

  // ═════════════════════════════════════════════════════════
  // 5. INTERACTION HANDLERS & BUTTON BINDINGS
  // ═════════════════════════════════════════════════════════
  // Mode Switch Tabs
  tabFasting.addEventListener('click', () => {
    activeMode = 'fasting';
    tabFasting.classList.add('active');
    tabKitchen.classList.remove('active');
    bottomFastingPanel.classList.add('active');
    bottomKitchenPanel.classList.remove('active');
    hudContainer.classList.remove('pulse-alert');
    if (currentFastingState) updateFastingUI(currentFastingState);
  });

  tabKitchen.addEventListener('click', () => {
    activeMode = 'kitchen';
    tabKitchen.classList.add('active');
    tabFasting.classList.remove('active');
    bottomKitchenPanel.classList.add('active');
    bottomFastingPanel.classList.remove('active');
    if (currentKitchenState) updateKitchenUI(currentKitchenState);
  });

  // Window Buttons
  btnPin.addEventListener('click', async () => {
    const isPinned = await api.toggleAlwaysOnTop();
    btnPin.classList.toggle('active', isPinned);
  });

  btnExpand.addEventListener('click', () => {
    api.toggleFullDashboard();
  });

  btnClose.addEventListener('click', () => {
    api.minimizeToTray();
  });

  centerStageOrb.addEventListener('dblclick', () => {
    api.toggleFullDashboard();
  });

  // Fasting Actions
  btnFastingToggle.addEventListener('click', async () => {
    if (currentFastingState && currentFastingState.activeSession) {
      await api.endFasting();
    } else {
      await api.startFasting('fasting', 16.0);
    }
  });

  btnAdjustMinus.addEventListener('click', () => {
    api.adjustTime(-15 * 60);
  });

  btnAdjustPlus.addEventListener('click', () => {
    api.adjustTime(15 * 60);
  });

  // Kitchen Actions
  btnKitchenToggle.addEventListener('click', () => {
    if (!currentKitchenState) return;
    if (currentKitchenState.isRunning) {
      api.pauseKitchenTimer();
    } else if (currentKitchenState.remainingSeconds > 0 && !currentKitchenState.isCompleted) {
      api.resumeKitchenTimer();
    } else {
      api.startKitchenTimer(currentKitchenState.name || 'ไข่ยางมะตูม', currentKitchenState.durationSeconds || 360);
    }
  });

  btnKitchenReset.addEventListener('click', () => {
    api.stopKitchenTimer();
    hudContainer.classList.remove('pulse-alert');
  });

  btnKitchenAddTwo.addEventListener('click', () => {
    api.addKitchenSeconds(120);
    hudContainer.classList.remove('pulse-alert');
  });

  presetPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      presetPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const name = pill.getAttribute('data-name');
      const secs = parseInt(pill.getAttribute('data-secs'), 10);
      api.startKitchenTimer(name, secs);
      hudContainer.classList.remove('pulse-alert');
    });
  });
});
