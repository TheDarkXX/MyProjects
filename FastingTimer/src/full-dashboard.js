// public/fasting.js
// Fasting & Autophagy Mobile Engine — DOCTORBANK

(function () {
  'use strict';

  // State
  let activeSession = null;
  let currentStatus = 'fasting'; // 'fasting' | 'eating'
  let targetHours = 16.0;
  let protocol = '16:8';
  let timerInterval = null;
  let serverNowDiffMs = 0; // Local clock vs server clock skew
  let editingSessionId = null;
  let deletingSessionId = null;
  const BASE_API_URL = 'https://brain.doctorbankonline.com';

  // DOM Elements
  const mainClock = document.getElementById('mainClock');
  const clockSubtitle = document.getElementById('clockSubtitle');
  const ringProgress = document.getElementById('ringProgress');
  const stateBadge = document.getElementById('stateBadge');
  const stagePill = document.getElementById('stagePill');
  const stageDot = document.getElementById('stageDot');
  const stageName = document.getElementById('stageName');
  const lblStartTime = document.getElementById('lblStartTime');
  const btnMainAction = document.getElementById('btnMainAction');
  const actionBtnIcon = document.getElementById('actionBtnIcon');
  const actionBtnText = document.getElementById('actionBtnText');
  const ambientGlow = document.getElementById('ambientGlow');
  const ringStageWrap = document.getElementById('ringStageWrap');
  const stageOrbGlass = document.getElementById('stageOrbGlass');
  const stageOrbEmblem = document.getElementById('stageOrbEmblem');

  // Tickers
  const tickerStreak = document.getElementById('tickerStreak');
  const tickerTotalHours = document.getElementById('tickerTotalHours');
  const tickerCompleted = document.getElementById('ticker-completed');

  // Modals
  const modalTimeAdjust = document.getElementById('modalTimeAdjust');
  const modalProtocol = document.getElementById('modalProtocol');
  const modalZombieReview = document.getElementById('modalZombieReview');
  const modalDeleteConfirm = document.getElementById('modalDeleteConfirm');
  const inputCustomDateTime = document.getElementById('inputCustomDateTime');
  const sheetErrorMsg = document.getElementById('sheetErrorMsg');

  // State Tracking
  let lastRenderedStageKey = null;

  // Circumference for r=130: 2 * PI * 130 = 816.81
  const RING_CIRCUMFERENCE = 816.81;

  // ─── Procedural SVG Vector Emblems ───
  const STAGE_EMBLEMS = {
    anabolic: `
      <svg viewBox="0 0 36 36" fill="none">
        <path d="M18 4C18 4 8 13 8 21C8 26.5 12.5 31 18 31C23.5 31 28 26.5 28 21C28 13 18 4 18 4Z" fill="url(#gradLeaf)" />
        <path d="M18 10V27M18 17L23 13M18 21L13 17" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
        <defs>
          <linearGradient id="gradLeaf" x1="8" y1="4" x2="28" y2="31">
            <stop stop-color="#38bdf8"/>
            <stop offset="1" stop-color="#10b981"/>
          </linearGradient>
        </defs>
      </svg>
    `,
    fatburn: `
      <svg viewBox="0 0 36 36" fill="none" class="svg-flame-flicker">
        <path d="M18 2C18 2 24 9 24 15C24 16.5 23.5 18 22.5 19C24 18 26 15 26 15C26 15 28 19 28 23C28 28.5 23.5 33 18 33C12.5 33 8 28.5 8 23C8 16 14 11 14 11C14 11 13 14 14 16C15 14 18 10 18 2Z" fill="url(#gradFlameCore)"/>
        <path d="M18 15C18 15 21 19 21 23C21 25.7 18.7 28 16 28C14.5 28 13.2 27.3 12.4 26.2C12 25.5 12 24.8 12 24C12 21 14 19 15 18C15.5 19 16 20 16 20C16 20 17 17 18 15Z" fill="#fef08a" opacity="0.95"/>
        <defs>
          <linearGradient id="gradFlameCore" x1="18" y1="2" x2="18" y2="33">
            <stop stop-color="#fef08a"/>
            <stop offset="0.3" stop-color="#f59e0b"/>
            <stop offset="0.7" stop-color="#ea580c"/>
            <stop offset="1" stop-color="#10b981"/>
          </linearGradient>
        </defs>
      </svg>
    `,
    ketosis: `
      <svg viewBox="0 0 36 36" fill="none" class="svg-synapse-pulse">
        <path d="M18 5L28 11V23L18 29L8 23V11L18 5Z" stroke="#c084fc" stroke-width="2.2" fill="rgba(139, 92, 246, 0.25)"/>
        <path d="M18 5V13M28 11L21 15M28 23L21 19M18 29V21M8 23L15 19M8 11L15 15" stroke="#e9d5ff" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="18" cy="17" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 4px #8b5cf6)"/>
      </svg>
    `,
    autophagy: `
      <svg viewBox="0 0 36 36" fill="none" class="svg-autophagy-spin">
        <circle cx="18" cy="18" r="12" stroke="url(#gradAutophagy)" stroke-width="2" stroke-dasharray="6 3"/>
        <circle cx="18" cy="18" r="5.5" fill="#fde047" opacity="0.85"/>
        <circle cx="28" cy="18" r="2.2" fill="#ffffff" filter="drop-shadow(0 0 4px #f59e0b)"/>
        <circle cx="8" cy="18" r="1.5" fill="#fde68a"/>
        <defs>
          <linearGradient id="gradAutophagy" x1="6" y1="6" x2="30" y2="30">
            <stop stop-color="#f59e0b"/>
            <stop offset="0.5" stop-color="#fbbf24"/>
            <stop offset="1" stop-color="#ffffff"/>
          </linearGradient>
        </defs>
      </svg>
    `,
    renewal: `
      <svg viewBox="0 0 36 36" fill="none">
        <path d="M18 2L22 14L34 18L22 22L18 34L14 22L2 18L14 14L18 2Z" fill="url(#gradDiamond)"/>
        <circle cx="18" cy="18" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 6px #ffffff)"/>
        <defs>
          <linearGradient id="gradDiamond" x1="2" y1="2" x2="34" y2="34">
            <stop stop-color="#ffffff"/>
            <stop offset="0.5" stop-color="#f43f5e"/>
            <stop offset="1" stop-color="#fb7185"/>
          </linearGradient>
        </defs>
      </svg>
    `,
    eating: `
      <svg viewBox="0 0 36 36" fill="none">
        <path d="M6 19C6 26 11.5 30 18 30C24.5 30 30 26 30 19H6Z" fill="url(#gradFeast)"/>
        <path d="M12 14C12 10 14.5 8 18 8C21.5 8 24 10 24 14" stroke="#fed7aa" stroke-width="2" stroke-linecap="round"/>
        <circle cx="18" cy="14" r="3" fill="#ffffff"/>
        <defs>
          <linearGradient id="gradFeast" x1="6" y1="19" x2="30" y2="30">
            <stop stop-color="#fb923c"/>
            <stop offset="1" stop-color="#ea580c"/>
          </linearGradient>
        </defs>
      </svg>
    `
  };

  // ─── Lightweight Canvas Environment Particle Engine ───
  const particleCanvas = document.getElementById('envParticlesCanvas');
  let particleCtx = null;
  let particles = [];
  let currentParticleHue = 'cyan';
  let particleAnimFrame = null;

  function createParticle() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 125 + Math.random() * 45;
    return {
      x: 180 + Math.cos(angle) * dist,
      y: 180 + Math.sin(angle) * dist,
      baseDist: dist,
      angle: angle,
      angularSpeed: (Math.random() - 0.5) * 0.012,
      vy: -(0.3 + Math.random() * 0.6),
      vx: (Math.random() - 0.5) * 0.35,
      size: 1.2 + Math.random() * 2.2,
      opacity: 0.2 + Math.random() * 0.7,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.03 + Math.random() * 0.05
    };
  }

  if (particleCanvas) {
    particleCtx = particleCanvas.getContext('2d');
    for (let i = 0; i < 18; i++) {
      particles.push(createParticle());
    }
    startParticleLoop();
  }

  function startParticleLoop() {
    function render() {
      if (document.hidden) {
        particleAnimFrame = requestAnimationFrame(render);
        return;
      }
      if (!particleCtx) return;
      particleCtx.clearRect(0, 0, 360, 360);

      let pColor = '56, 189, 248';
      if (currentParticleHue === 'fire') pColor = Math.random() > 0.4 ? '245, 158, 11' : '16, 185, 129';
      else if (currentParticleHue === 'violet') pColor = Math.random() > 0.3 ? '139, 92, 246' : '192, 132, 252';
      else if (currentParticleHue === 'gold') pColor = Math.random() > 0.3 ? '251, 191, 36' : '254, 240, 138';
      else if (currentParticleHue === 'crimson') pColor = Math.random() > 0.4 ? '244, 63, 94' : '255, 255, 255';
      else if (currentParticleHue === 'sunset') pColor = Math.random() > 0.3 ? '251, 146, 60' : '244, 63, 94';

      for (let p of particles) {
        p.pulse += p.pulseSpeed;
        const currentAlpha = Math.max(0.1, Math.min(1, p.opacity * (0.6 + 0.4 * Math.sin(p.pulse))));

        if (currentParticleHue === 'fire' || currentParticleHue === 'sunset') {
          p.y += p.vy;
          p.x += p.vx + Math.sin(p.pulse) * 0.3;
          if (p.y < 30 || p.x < 20 || p.x > 340) {
            Object.assign(p, createParticle());
            p.y = 220 + Math.random() * 40;
          }
        } else {
          p.angle += p.angularSpeed;
          p.x = 180 + Math.cos(p.angle) * p.baseDist;
          p.y = 180 + Math.sin(p.angle) * p.baseDist;
        }

        particleCtx.beginPath();
        particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        particleCtx.fillStyle = `rgba(${pColor}, ${currentAlpha})`;
        particleCtx.shadowColor = `rgb(${pColor})`;
        particleCtx.shadowBlur = 6;
        particleCtx.fill();
      }

      particleAnimFrame = requestAnimationFrame(render);
    }
    particleAnimFrame = requestAnimationFrame(render);
  }

  // ─── Format Helpers ───
  function pad(n) {
    return String(Math.floor(n)).padStart(2, '0');
  }

  function formatDuration(totalSeconds) {
    const s = Math.max(0, totalSeconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  function formatTimeHHMM(isoString) {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function toLocalDatetimeInputString(isoString) {
    const d = isoString ? new Date(isoString) : new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  }

  // ─── Biological Stages Calculator ───
  function getBiologicalStage(elapsedSeconds) {
    const hours = elapsedSeconds / 3600;
    if (hours < 4) {
      return {
        stageIndex: 0,
        key: 'anabolic',
        phaseClass: 'phase-anabolic',
        name: 'Anabolic / Digestion (0-4h)',
        color: '#38bdf8',
        gradient: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
        particleHue: 'cyan'
      };
    } else if (hours < 12) {
      return {
        stageIndex: 1,
        key: 'fatburn',
        phaseClass: 'phase-fatburn',
        name: 'Fat Burning Zone (4-12h)',
        color: '#10b981',
        gradient: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(245, 158, 11, 0.15) 50%, transparent 70%)',
        particleHue: 'fire'
      };
    } else if (hours < 16) {
      return {
        stageIndex: 2,
        key: 'ketosis',
        phaseClass: 'phase-ketosis',
        name: 'Ketosis Switch (12-16h)',
        color: '#8b5cf6',
        gradient: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)',
        particleHue: 'violet'
      };
    } else if (hours < 24) {
      return {
        stageIndex: 3,
        key: 'autophagy',
        phaseClass: 'phase-autophagy',
        name: 'Autophagy Peak (16-24h)',
        color: '#f59e0b',
        gradient: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(251, 191, 36, 0.15) 50%, transparent 70%)',
        particleHue: 'gold'
      };
    } else {
      return {
        stageIndex: 4,
        key: 'renewal',
        phaseClass: 'phase-renewal',
        name: 'Deep Cellular Renewal (24h+)',
        color: '#f43f5e',
        gradient: 'radial-gradient(circle, rgba(244, 63, 94, 0.35) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
        particleHue: 'crimson'
      };
    }
  }

  // ─── Load Status from API ───
  async function loadStatus() {
    try {
      const res = await fetch(BASE_API_URL + '/api/fasting/status');
      const data = await res.json();
      if (!data.success) return;

      activeSession = data.active_session;
      currentStatus = data.current_status || (activeSession ? activeSession.session_type : 'fasting');
      targetHours = activeSession ? (activeSession.target_hours || 16.0) : (currentStatus === 'fasting' ? 16.0 : 8.0);
      protocol = activeSession ? (activeSession.protocol || '16:8') : '16:8';

      // Measure server time drift
      if (data.server_now_utc) {
        serverNowDiffMs = new Date(data.server_now_utc).getTime() - Date.now();
      }

      // Update Tickers
      if (data.stats) {
        if (tickerStreak) tickerStreak.textContent = `${data.stats.current_streak_days || 0} Days`;
        if (tickerTotalHours) tickerTotalHours.textContent = `${data.stats.total_fasting_hours || 0} hrs`;
        if (tickerCompleted) tickerCompleted.textContent = `${data.stats.total_fasts_completed || 0}`;
      }

      // Update Protocol Label
      const protoLbl = document.getElementById('header-protocol-label');
      if (protoLbl) protoLbl.textContent = protocol;

      // Zombie Check
      if (data.needs_review) {
        showZombieModal();
      }

      updateUI();
    } catch (err) {
      console.error('[fasting-ui] loadStatus error:', err);
    }
  }

  // ─── Update UI Clock & Ring ───
  function updateUI() {
    const nowMs = Date.now() + serverNowDiffMs;
    let elapsedSeconds = 0;
    const targetSeconds = Math.round(targetHours * 3600);

    if (activeSession && activeSession.started_at_utc) {
      const startMs = new Date(activeSession.started_at_utc).getTime();
      elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    }

    // Format main digital clock
    if (mainClock) {
      mainClock.textContent = formatDuration(elapsedSeconds);
    }

    // Progress Arc Calculation
    const progressRatio = Math.min(1.0, elapsedSeconds / targetSeconds);
    const strokeOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progressRatio);
    if (ringProgress) {
      ringProgress.style.strokeDashoffset = strokeOffset;
    }

    const percentText = Math.round(progressRatio * 100);

    // State & Colors
    if (currentStatus === 'fasting') {
      const stage = getBiologicalStage(elapsedSeconds);

      // Environment & Stage Orb Morphing
      if (lastRenderedStageKey !== stage.key) {
        lastRenderedStageKey = stage.key;
        if (ringStageWrap) {
          ringStageWrap.className = `ring-stage-wrap ${stage.phaseClass}`;
        }
        if (stageOrbEmblem && STAGE_EMBLEMS[stage.key]) {
          stageOrbEmblem.innerHTML = STAGE_EMBLEMS[stage.key];
        }
        if (stageOrbGlass) {
          stageOrbGlass.style.borderColor = `${stage.color}66`;
          stageOrbGlass.style.boxShadow = `0 6px 20px rgba(0, 0, 0, 0.45), 0 0 24px ${stage.color}55, inset 0 2px 6px rgba(255, 255, 255, 0.4)`;
        }
        currentParticleHue = stage.particleHue;
      }

      if (stateBadge) {
        stateBadge.textContent = '🔥 FASTING';
        stateBadge.style.background = `${stage.color}1a`;
        stateBadge.style.color = stage.color;
        stateBadge.style.borderColor = `${stage.color}40`;
      }
      if (ringProgress) {
        ringProgress.style.stroke = 'url(#ringGradFasting)';
      }
      if (clockSubtitle) {
        clockSubtitle.textContent = `Target: ${targetHours}h 00m (${percentText}%)`;
      }

      // Biological Stage Label
      if (stageName) stageName.textContent = stage.name;
      if (stageDot) stageDot.style.background = stage.color;
      if (stageDot) stageDot.style.boxShadow = `0 0 8px ${stage.color}`;
      if (ambientGlow) ambientGlow.style.background = stage.gradient;

      // Button
      if (btnMainAction) {
        btnMainAction.className = 'btn-main-action btn-break-fast';
        if (actionBtnIcon) actionBtnIcon.textContent = '🍽️';
        if (actionBtnText) actionBtnText.textContent = 'Break Fast (Start Eating)';
      }
    } else {
      // Eating window
      if (lastRenderedStageKey !== 'eating') {
        lastRenderedStageKey = 'eating';
        if (ringStageWrap) {
          ringStageWrap.className = 'ring-stage-wrap phase-eating';
        }
        if (stageOrbEmblem && STAGE_EMBLEMS.eating) {
          stageOrbEmblem.innerHTML = STAGE_EMBLEMS.eating;
        }
        if (stageOrbGlass) {
          stageOrbGlass.style.borderColor = 'rgba(251, 146, 60, 0.4)';
          stageOrbGlass.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.45), 0 0 24px rgba(251, 146, 60, 0.4), inset 0 2px 6px rgba(255, 255, 255, 0.4)';
        }
        currentParticleHue = 'sunset';
      }

      if (stateBadge) {
        stateBadge.textContent = '🍽️ EATING WINDOW';
        stateBadge.style.background = 'rgba(245, 158, 11, 0.16)';
        stateBadge.style.color = '#fcd34d';
        stateBadge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      }
      if (ringProgress) {
        ringProgress.style.stroke = 'url(#ringGradEating)';
      }

      const remainingSec = Math.max(0, targetSeconds - elapsedSeconds);
      if (clockSubtitle) {
        clockSubtitle.textContent = `Remaining Eating Time: ${formatDuration(remainingSec)}`;
      }

      if (stageName) stageName.textContent = 'Eating Window (Feast)';
      if (stageDot) stageDot.style.background = '#f59e0b';
      if (stageDot) stageDot.style.boxShadow = '0 0 8px #f59e0b';
      if (ambientGlow) {
        ambientGlow.style.background = 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, transparent 75%)';
      }

      // Button
      if (btnMainAction) {
        btnMainAction.className = 'btn-main-action btn-start-fast';
        if (actionBtnIcon) actionBtnIcon.textContent = '🛑';
        if (actionBtnText) actionBtnText.textContent = 'End Eating & Start Fast';
      }
    }

    // Editable timestamp text
    if (lblStartTime) {
      if (activeSession && activeSession.started_at_utc) {
        lblStartTime.textContent = `Started: Today ${formatTimeHHMM(activeSession.started_at_utc)}`;
      } else {
        lblStartTime.textContent = 'No Active Session';
      }
    }
  }

  // ─── Main Action Button (Toggle / Start Next Session) ───
  async function handleMainAction() {
    try {
      const nextType = currentStatus === 'fasting' ? 'eating' : 'fasting';
      const nextTarget = nextType === 'fasting' ? 16.0 : 8.0;

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(25);

      btnMainAction.disabled = true;
      btnMainAction.style.opacity = '0.6';

      const res = await fetch(BASE_API_URL + '/api/fasting/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_type: nextType,
          protocol: protocol,
          target_hours: nextTarget,
          started_at_utc: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        await loadStatus();
      } else {
        alert(data.error || 'Failed to switch session status');
      }
    } catch (err) {
      console.error('[fasting-ui] handleMainAction error:', err);
    } finally {
      btnMainAction.disabled = false;
      btnMainAction.style.opacity = '1';
    }
  }

  // ─── 24h Safe-Lock Drum Roller & Date Selector Controller ───
  let selectedAdjustDate = toLocalDateString(new Date());
  let currentDrumHour = 12;
  let currentDrumMinute = 0;
  let isDrumInitialized = false;

  function toLocalDateString(d) {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }

  function initDrumRoller() {
    if (isDrumInitialized) return;
    const hoursCyl = document.getElementById('drumHoursCylinder');
    const minsCyl = document.getElementById('drumMinutesCylinder');
    if (!hoursCyl || !minsCyl) return;

    // Build hours: pad + 00..23 + pad
    hoursCyl.innerHTML = '<div class="drum-cylinder-pad"></div>';
    for (let h = 0; h < 24; h++) {
      const item = document.createElement('div');
      item.className = 'drum-item';
      item.dataset.val = h;
      item.textContent = String(h).padStart(2, '0');
      item.addEventListener('click', () => {
        hoursCyl.scrollTo({ top: h * 50, behavior: 'smooth' });
      });
      hoursCyl.appendChild(item);
    }
    const hPadBottom = document.createElement('div');
    hPadBottom.className = 'drum-cylinder-pad';
    hoursCyl.appendChild(hPadBottom);

    // Build minutes: pad + 00..59 + pad
    minsCyl.innerHTML = '<div class="drum-cylinder-pad"></div>';
    for (let m = 0; m < 60; m++) {
      const item = document.createElement('div');
      item.className = 'drum-item';
      item.dataset.val = m;
      item.textContent = String(m).padStart(2, '0');
      item.addEventListener('click', () => {
        minsCyl.scrollTo({ top: m * 50, behavior: 'smooth' });
      });
      minsCyl.appendChild(item);
    }
    const mPadBottom = document.createElement('div');
    mPadBottom.className = 'drum-cylinder-pad';
    minsCyl.appendChild(mPadBottom);

    // Scroll listeners
    let hourScrollTimeout = null;
    hoursCyl.addEventListener('scroll', () => {
      const h = Math.max(0, Math.min(23, Math.round(hoursCyl.scrollTop / 50)));
      if (h !== currentDrumHour) {
        currentDrumHour = h;
        updateActiveDrumClasses();
        updateCombinedTimeInput();
      }
      clearTimeout(hourScrollTimeout);
      hourScrollTimeout = setTimeout(() => {
        updateActiveDrumClasses();
      }, 100);
    }, { passive: true });

    let minScrollTimeout = null;
    minsCyl.addEventListener('scroll', () => {
      const m = Math.max(0, Math.min(59, Math.round(minsCyl.scrollTop / 50)));
      if (m !== currentDrumMinute) {
        currentDrumMinute = m;
        updateActiveDrumClasses();
        updateCombinedTimeInput();
      }
      clearTimeout(minScrollTimeout);
      minScrollTimeout = setTimeout(() => {
        updateActiveDrumClasses();
      }, 100);
    }, { passive: true });

    isDrumInitialized = true;
  }

  function updateActiveDrumClasses() {
    const hoursCyl = document.getElementById('drumHoursCylinder');
    const minsCyl = document.getElementById('drumMinutesCylinder');
    const preview = document.getElementById('drumTimePreview');
    if (!hoursCyl || !minsCyl) return;

    const hourItems = hoursCyl.querySelectorAll('.drum-item');
    hourItems.forEach((el, idx) => {
      if (idx === currentDrumHour) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    const minItems = minsCyl.querySelectorAll('.drum-item');
    minItems.forEach((el, idx) => {
      if (idx === currentDrumMinute) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    if (preview) {
      preview.textContent = `${String(currentDrumHour).padStart(2, '0')}:${String(currentDrumMinute).padStart(2, '0')}`;
    }
  }

  function updateCombinedTimeInput() {
    const combined = `${selectedAdjustDate}T${String(currentDrumHour).padStart(2, '0')}:${String(currentDrumMinute).padStart(2, '0')}`;
    if (inputCustomDateTime) {
      inputCustomDateTime.value = combined;
    }
  }

  function setDrumTime(hours, minutes, smooth = false) {
    initDrumRoller();
    currentDrumHour = Math.max(0, Math.min(23, hours));
    currentDrumMinute = Math.max(0, Math.min(59, minutes));

    const hoursCyl = document.getElementById('drumHoursCylinder');
    const minsCyl = document.getElementById('drumMinutesCylinder');

    if (hoursCyl) {
      hoursCyl.scrollTo({ top: currentDrumHour * 50, behavior: smooth ? 'smooth' : 'auto' });
    }
    if (minsCyl) {
      minsCyl.scrollTo({ top: currentDrumMinute * 50, behavior: smooth ? 'smooth' : 'auto' });
    }

    updateActiveDrumClasses();
    updateCombinedTimeInput();
  }

  window.selectAdjustDate = function (type) {
    const btnToday = document.getElementById('btnDateToday');
    const btnYest = document.getElementById('btnDateYesterday');
    const lblCust = document.getElementById('lblCustomDate');
    const txtCust = document.getElementById('txtCustomDate');

    btnToday?.classList.remove('active');
    btnYest?.classList.remove('active');
    lblCust?.classList.remove('active');

    const now = new Date();
    if (type === 'today') {
      btnToday?.classList.add('active');
      selectedAdjustDate = toLocalDateString(now);
      if (txtCust) txtCust.textContent = '📅 Pick Date';
    } else if (type === 'yesterday') {
      btnYest?.classList.add('active');
      const yest = new Date(now.getTime() - 86400000);
      selectedAdjustDate = toLocalDateString(yest);
      if (txtCust) txtCust.textContent = '📅 Pick Date';
    }
    updateCombinedTimeInput();
  };

  window.onCustomDatePicked = function (val) {
    if (!val) return;
    const btnToday = document.getElementById('btnDateToday');
    const btnYest = document.getElementById('btnDateYesterday');
    const lblCust = document.getElementById('lblCustomDate');
    const txtCust = document.getElementById('txtCustomDate');

    btnToday?.classList.remove('active');
    btnYest?.classList.remove('active');
    lblCust?.classList.add('active');

    selectedAdjustDate = val;
    if (txtCust) {
      const parts = val.split('-');
      txtCust.textContent = parts.length === 3 ? `📅 ${parts[1]}/${parts[2]}` : `📅 ${val}`;
    }
    updateCombinedTimeInput();
  };

  window.openTimeAdjustModal = function (sessionId, initialUtcIso) {
    initDrumRoller();
    editingSessionId = sessionId;
    sheetErrorMsg.style.display = 'none';

    const targetDate = initialUtcIso ? new Date(initialUtcIso) : new Date();
    const now = new Date();
    const targetDateStr = toLocalDateString(targetDate);
    const todayStr = toLocalDateString(now);
    const yestStr = toLocalDateString(new Date(now.getTime() - 86400000));

    if (targetDateStr === todayStr) {
      window.selectAdjustDate('today');
    } else if (targetDateStr === yestStr) {
      window.selectAdjustDate('yesterday');
    } else {
      const inputAdjustDate = document.getElementById('inputAdjustDate');
      if (inputAdjustDate) inputAdjustDate.value = targetDateStr;
      window.onCustomDatePicked(targetDateStr);
    }

    modalTimeAdjust.classList.add('open');

    requestAnimationFrame(() => {
      setDrumTime(targetDate.getHours(), targetDate.getMinutes(), false);
      setTimeout(() => {
        setDrumTime(targetDate.getHours(), targetDate.getMinutes(), false);
      }, 50);
    });
  };

  document.getElementById('btnOpenTimeAdjust')?.addEventListener('click', () => {
    if (!activeSession) return;
    window.openTimeAdjustModal(activeSession.id, activeSession.started_at_utc);
  });

  window.closeTimeModal = function () {
    modalTimeAdjust.classList.remove('open');
  };

  window.applyTimeOffset = function (minutes) {
    const combinedStr = `${selectedAdjustDate}T${String(currentDrumHour).padStart(2, '0')}:${String(currentDrumMinute).padStart(2, '0')}`;
    const d = new Date(combinedStr);
    d.setMinutes(d.getMinutes() + minutes);

    const newDateStr = toLocalDateString(d);
    const now = new Date();
    const todayStr = toLocalDateString(now);
    const yestStr = toLocalDateString(new Date(now.getTime() - 86400000));

    if (newDateStr === todayStr) {
      window.selectAdjustDate('today');
    } else if (newDateStr === yestStr) {
      window.selectAdjustDate('yesterday');
    } else {
      const inputAdjustDate = document.getElementById('inputAdjustDate');
      if (inputAdjustDate) inputAdjustDate.value = newDateStr;
      window.onCustomDatePicked(newDateStr);
    }

    setDrumTime(d.getHours(), d.getMinutes(), true);
  };

  document.getElementById('btnSaveTimeAdjust')?.addEventListener('click', async () => {
    try {
      const selectedStr = inputCustomDateTime.value;
      if (!selectedStr) return;

      const newDate = new Date(selectedStr);
      if (newDate.getTime() > Date.now() + 60000) {
        sheetErrorMsg.textContent = 'Cannot select future date or time';
        sheetErrorMsg.style.display = 'block';
        return;
      }

      const res = await fetch(`/api/fasting/sessions/${editingSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          started_at_utc: newDate.toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        closeTimeModal();
        await loadStatus();
      } else {
        sheetErrorMsg.textContent = data.error || 'Failed to update start time';
        sheetErrorMsg.style.display = 'block';
      }
    } catch (err) {
      console.error('[fasting-ui] saveTimeAdjust error:', err);
    }
  });

  // ─── Protocol Modal ───
  document.getElementById('btn-protocol-menu')?.addEventListener('click', () => {
    modalProtocol.classList.add('open');
  });

  window.closeProtocolModal = function () {
    modalProtocol.classList.remove('open');
  };

  document.querySelectorAll('.protocol-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      document.querySelectorAll('.protocol-option').forEach(o => {
        o.classList.remove('active');
        o.querySelector('.proto-check').textContent = '';
      });
      opt.classList.add('active');
      opt.querySelector('.proto-check').textContent = '✓';

      protocol = opt.getAttribute('data-protocol');
      targetHours = parseFloat(opt.getAttribute('data-target'));

      if (activeSession) {
        await fetch(`/api/fasting/sessions/${activeSession.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_hours: targetHours
          })
        });
      }

      closeProtocolModal();
      await loadStatus();
    });
  });

  // ─── Zombie Modal ───
  function showZombieModal() {
    modalZombieReview.classList.add('open');
  }

  window.resolveZombieFast = async function (choice) {
    if (!activeSession) return;
    try {
      if (choice === 'keep') {
        modalZombieReview.classList.remove('open');
      } else if (choice === 'cap_target') {
        const startMs = new Date(activeSession.started_at_utc).getTime();
        const endMs = startMs + (16 * 3600 * 1000);
        await fetch(`/api/fasting/sessions/${activeSession.id}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ended_at_utc: new Date(endMs).toISOString(),
            notes: 'Automatically capped at 16h target'
          })
        });
        modalZombieReview.classList.remove('open');
        await loadStatus();
      } else if (choice === 'discard') {
        await fetch(`/api/fasting/sessions/${activeSession.id}`, {
          method: 'DELETE'
        });
        modalZombieReview.classList.remove('open');
        await loadStatus();
      }
    } catch (err) {
      console.error('[fasting-ui] resolveZombieFast error:', err);
    }
  };

  // ─── Load Analytics & Personal Lab ───
  async function loadAnalytics() {
    try {
      const res = await fetch(BASE_API_URL + '/api/fasting/stats');
      const data = await res.json();
      if (!data.success) return;

      // KPIs
      if (data.stats) {
        document.getElementById('ana-current-streak').textContent = `${data.stats.current_streak_days || 0} Days`;
        document.getElementById('ana-best-streak').textContent = `${data.stats.best_streak_days || 0} Days`;
        document.getElementById('ana-total-fasts').textContent = `${data.stats.total_fasts_completed || 0}`;
        document.getElementById('ana-total-hours').textContent = `${data.stats.total_fasting_hours || 0} hrs`;
      }

      // Weekly Matrix Bars
      const matrixContainer = document.getElementById('weeklyMatrixBars');
      if (matrixContainer && data.weekly_matrix) {
        matrixContainer.innerHTML = '';
        const maxVal = Math.max(20, ...data.weekly_matrix.map(d => d.fasting_hours));

        data.weekly_matrix.forEach(item => {
          const col = document.createElement('div');
          col.className = 'matrix-bar-col';

          const pct = Math.min(100, Math.round((item.fasting_hours / maxVal) * 100));
          const isAchieved = item.is_target_met;

          col.innerHTML = `
            <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px; font-variant-numeric: tabular-nums;">
              ${item.fasting_hours > 0 ? `${item.fasting_hours}h` : '-'}
            </div>
            <div class="matrix-bar-fill ${isAchieved ? 'achieved' : ''}" style="height: ${Math.max(6, pct)}%;"></div>
            <div class="matrix-day-lbl">${item.dayName}</div>
          `;
          matrixContainer.appendChild(col);
        });
      }
    } catch (err) {
      console.error('[fasting-ui] loadAnalytics error:', err);
    }
  }

  // ─── Load History Ledger ───
  async function loadHistory() {
    try {
      const res = await fetch(BASE_API_URL + '/api/fasting/history?limit=30');
      const data = await res.json();
      if (!data.success) return;

      const countPill = document.getElementById('lblLedgerCount');
      if (countPill) countPill.textContent = `${data.total_count || 0} Sessions`;

      const listContainer = document.getElementById('historyList');
      if (!listContainer) return;

      if (!data.sessions || data.sessions.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 13px;">
            No past fasting or eating sessions recorded yet.
          </div>
        `;
        return;
      }

      listContainer.innerHTML = '';
      data.sessions.forEach(s => {
        const isFast = s.session_type === 'fasting';
        const startStr = formatTimeHHMM(s.started_at_utc);
        const endStr = s.ended_at_utc ? formatTimeHHMM(s.ended_at_utc) : 'In Progress';
        const dateStr = new Date(s.started_at_utc).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        const durationFormatted = formatDuration(s.duration_seconds || 0);

        const card = document.createElement('div');
        card.className = 'history-item-card';
        card.innerHTML = `
          <div class="hist-left">
            <div class="hist-badge-row">
              <span class="hist-tag ${isFast ? 'fasting' : 'eating'}">${isFast ? 'FAST' : 'EAT'}</span>
              <span class="hist-date">${dateStr}</span>
              ${s.status === 'active' ? '<span style="font-size: 10px; color: #34d399;">● In Progress</span>' : ''}
            </div>
            <div class="hist-duration">${durationFormatted}</div>
            <div class="hist-time-range">${startStr} ➔ ${endStr} • ${s.protocol || '16:8'}</div>
          </div>
          <div class="hist-right-actions">
            <button class="btn-hist-action" onclick="window.editHistorySession('${s.id}', '${s.started_at_utc}')" title="Edit Start Time">✏️</button>
            <button class="btn-hist-action" onclick="window.confirmDeleteSession('${s.id}')" title="Delete Session">🗑️</button>
          </div>
        `;
        listContainer.appendChild(card);
      });
    } catch (err) {
      console.error('[fasting-ui] loadHistory error:', err);
    }
  }

  // History Actions
  window.editHistorySession = function (id, startedAt) {
    window.openTimeAdjustModal(id, startedAt);
  };

  window.confirmDeleteSession = function (id) {
    deletingSessionId = id;
    modalDeleteConfirm.classList.add('open');
  };

  window.closeDeleteModal = function () {
    modalDeleteConfirm.classList.remove('open');
  };

  document.getElementById('btnConfirmDeleteSession')?.addEventListener('click', async () => {
    if (!deletingSessionId) return;
    try {
      const res = await fetch(`/api/fasting/sessions/${deletingSessionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        closeDeleteModal();
        await loadStatus();
        await loadHistory();
      }
    } catch (err) {
      console.error('[fasting-ui] deleteSession error:', err);
    }
  });

  // ─── Pixar 3D Stage Visuals & Bio-Scan Data ───
  const PIXAR_STAGES = [
    {
      index: 0,
      key: 'anabolic',
      name: 'Stage 1: Digestion & Anabolic',
      timeRange: '0 - 4 hours',
      tag: 'STAGE 1 • DIGESTION',
      image: 'assets/fasting/stage1_digestion.jpg',
      color: '#38bdf8',
      summary: 'Your body is gently digesting recent meals and absorbing clean nutrients. Insulin is beginning to calm down as blood sugar normalizes.',
      meters: [
        { label: 'Digestion Activity', value: 'Active 85%', percent: 85, color: '#38bdf8', icon: '🥣' },
        { label: 'Blood Glucose', value: 'Normalizing', percent: 60, color: '#60a5fa', icon: '🩸' },
        { label: 'Energy Source', value: 'Food Intake', percent: 90, color: '#34d399', icon: '⚡' }
      ]
    },
    {
      index: 1,
      key: 'fatburn',
      name: 'Stage 2: Fat Burning Zone',
      timeRange: '4 - 12 hours',
      tag: 'STAGE 2 • FAT BURN',
      image: 'assets/fasting/stage2_fatburn.jpg',
      color: '#10b981',
      summary: 'Sugar is all gone! Liver glycogen is depleted and your body has lit the furnace, melting stored body fat into clean daily energy.',
      meters: [
        { label: 'Fat Oxidation Furnace', value: 'Active 90%', percent: 90, color: '#f59e0b', icon: '🔥' },
        { label: 'Insulin Level', value: 'Drained (Low)', percent: 20, color: '#10b981', icon: '🩸' },
        { label: 'Growth Hormone (HGH)', value: 'Rising', percent: 65, color: '#fbbf24', icon: '⚡' }
      ]
    },
    {
      index: 2,
      key: 'ketosis',
      name: 'Stage 3: Ketosis Switch',
      timeRange: '12 - 16 hours',
      tag: 'STAGE 3 • KETOSIS',
      image: 'assets/fasting/stage3_ketosis.jpg',
      color: '#8b5cf6',
      summary: 'Your brain is running on high-octane ketone fuel! Mental fog completely clears away, focus peaks, and systemic inflammation quiets down.',
      meters: [
        { label: 'Ketones (BHB)', value: 'Surging 1.8 mM', percent: 88, color: '#a855f7', icon: '⚡' },
        { label: 'Mental Clarity', value: 'Peak 95%', percent: 95, color: '#38bdf8', icon: '🧠' },
        { label: 'Hunger & Cravings', value: 'Suppressed', percent: 15, color: '#34d399', icon: '😌' }
      ]
    },
    {
      index: 3,
      key: 'autophagy',
      name: 'Stage 4: Autophagy Peak',
      timeRange: '16 - 24 hours',
      tag: 'STAGE 4 • AUTOPHAGY',
      image: 'assets/fasting/stage4_autophagy.jpg',
      color: '#f59e0b',
      summary: 'Cellular self-cleaning mode active! Your cells are vacuuming away old damaged proteins and recycling defective mitochondria into pure vitality.',
      meters: [
        { label: 'Cellular Cleansing', value: 'Active 88%', percent: 88, color: '#10b981', icon: '🧹' },
        { label: 'Defective Protein Recycled', value: 'High', percent: 80, color: '#f59e0b', icon: '♻️' },
        { label: 'Anti-Aging Repair', value: 'Surging', percent: 92, color: '#ec4899', icon: '✨' }
      ]
    },
    {
      index: 4,
      key: 'renewal',
      name: 'Stage 5: Deep Cellular Renewal',
      timeRange: '24+ hours',
      tag: 'STAGE 5 • RENEWAL',
      image: 'assets/fasting/stage5_renewal.jpg',
      color: '#f43f5e',
      summary: 'Total biological reset! Fresh stem cells awaken with a magic shield of youth, resetting your immune system and repairing deep structures.',
      meters: [
        { label: 'Stem Cell Activation', value: 'Triggered', percent: 95, color: '#f43f5e', icon: '👑' },
        { label: 'Immune System Reboot', value: 'Active', percent: 90, color: '#fbbf24', icon: '🛡️' },
        { label: 'Longevity Pathways', value: 'Maximum', percent: 98, color: '#a855f7', icon: '🌟' }
      ]
    }
  ];

  let currentBioModalStageIdx = 0;

  // ─── Bio-Scan Modal Handlers ───
  window.openBioScanModal = function(stageIdx) {
    const modal = document.getElementById('modalBioScan');
    if (!modal) return;

    if (typeof stageIdx === 'number' && stageIdx >= 0 && stageIdx < PIXAR_STAGES.length) {
      currentBioModalStageIdx = stageIdx;
    } else {
      if (currentStatus === 'fasting' && currentFastStart) {
        const elapsed = Math.max(0, (Date.now() - new Date(currentFastStart).getTime()) / 1000);
        const curStage = getBiologicalStage(elapsed);
        currentBioModalStageIdx = curStage.stageIndex ?? 1;
      } else {
        currentBioModalStageIdx = 0;
      }
    }

    renderBioModalStage(currentBioModalStageIdx);
    modal.classList.add('open');
    modal.classList.add('show');
  };

  window.closeBioScanModal = function() {
    const modal = document.getElementById('modalBioScan');
    if (modal) {
      modal.classList.remove('open');
      modal.classList.remove('show');
    }
  };

  window.switchBioStage = function(idx) {
    if (idx >= 0 && idx < PIXAR_STAGES.length) {
      currentBioModalStageIdx = idx;
      renderBioModalStage(idx);
    }
  };

  window.stepBioStage = function(dir) {
    const nextIdx = (currentBioModalStageIdx + dir + PIXAR_STAGES.length) % PIXAR_STAGES.length;
    window.switchBioStage(nextIdx);
  };

  function renderBioModalStage(idx) {
    const stage = PIXAR_STAGES[idx];
    if (!stage) return;

    const tagEl = document.getElementById('bioModalTag');
    const titleEl = document.getElementById('bioModalTitle');
    const timingEl = document.getElementById('bioModalTiming');
    const heroImgEl = document.getElementById('bioHeroImg');
    const heroBadgeEl = document.getElementById('bioHeroBadge');
    const storyTextEl = document.getElementById('bioStoryText');
    const metersGridEl = document.getElementById('bioMetersGrid');
    const stepperEl = document.getElementById('bioStageStepper');

    if (tagEl) tagEl.textContent = stage.tag;
    if (titleEl) {
      titleEl.textContent = stage.name;
      titleEl.style.color = stage.color;
    }
    if (timingEl) {
      timingEl.textContent = stage.timeRange;
      timingEl.style.color = stage.color;
      timingEl.style.background = `${stage.color}1f`;
    }

    if (heroImgEl) {
      heroImgEl.style.opacity = '0.3';
      heroImgEl.style.transform = 'scale(0.96)';
      setTimeout(() => {
        heroImgEl.src = stage.image;
        heroImgEl.style.opacity = '1';
        heroImgEl.style.transform = 'scale(1)';
      }, 70);
    }

    // Determine badge state
    let activeStageIdx = -1;
    if (currentStatus === 'fasting' && currentFastStart) {
      const elapsed = Math.max(0, (Date.now() - new Date(currentFastStart).getTime()) / 1000);
      activeStageIdx = getBiologicalStage(elapsed).stageIndex;
    }

    if (heroBadgeEl) {
      if (idx === activeStageIdx) {
        heroBadgeEl.textContent = '⚡ CURRENT ACTIVE STAGE';
        heroBadgeEl.style.background = 'rgba(16, 185, 129, 0.25)';
        heroBadgeEl.style.borderColor = '#10b981';
        heroBadgeEl.style.color = '#34d399';
        heroBadgeEl.style.display = 'block';
      } else if (idx < activeStageIdx) {
        heroBadgeEl.textContent = '✓ COMPLETED';
        heroBadgeEl.style.background = 'rgba(56, 189, 248, 0.2)';
        heroBadgeEl.style.borderColor = '#38bdf8';
        heroBadgeEl.style.color = '#38bdf8';
        heroBadgeEl.style.display = 'block';
      } else {
        heroBadgeEl.textContent = '🔒 UPCOMING';
        heroBadgeEl.style.background = 'rgba(255, 255, 255, 0.08)';
        heroBadgeEl.style.borderColor = 'rgba(255, 255, 255, 0.18)';
        heroBadgeEl.style.color = 'var(--text-muted)';
        heroBadgeEl.style.display = 'block';
      }
    }

    if (storyTextEl) storyTextEl.textContent = stage.summary;

    // Stepper buttons
    if (stepperEl) {
      const buttons = stepperEl.querySelectorAll('.bio-step-btn');
      buttons.forEach((btn, bIdx) => {
        if (bIdx === idx) {
          btn.classList.add('active');
          btn.style.borderColor = stage.color;
          btn.style.boxShadow = `0 0 12px ${stage.color}40`;
        } else {
          btn.classList.remove('active');
          btn.style.borderColor = '';
          btn.style.boxShadow = '';
        }
      });
    }

    // Status Meters
    if (metersGridEl) {
      metersGridEl.innerHTML = stage.meters.map(m => `
        <div class="bio-meter-card">
          <div class="bio-meter-head">
            <span class="bio-meter-name">${m.icon} ${m.label}</span>
            <span class="bio-meter-val" style="color: ${m.color};">${m.value}</span>
          </div>
          <div class="bio-meter-bar-track">
            <div class="bio-meter-bar-fill" style="width: ${m.percent}%; background: ${m.color};"></div>
          </div>
        </div>
      `).join('');
    }
  }

  // ─── Tab Switching ───
  const navTabs = document.querySelectorAll('.nav-tab');
  const viewContents = document.querySelectorAll('.view-content');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      viewContents.forEach(view => {
        if (view.id === `view-${targetTab}`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });

      if (targetTab === 'analytics') {
        loadAnalytics();
      } else if (targetTab === 'ledger') {
        loadHistory();
      }
    });
  });

  // ─── Initialization ───
  btnMainAction?.addEventListener('click', handleMainAction);

  loadStatus();

  // Run 1-second clock loop
  timerInterval = setInterval(() => {
    updateUI();
  }, 1000);

})();
