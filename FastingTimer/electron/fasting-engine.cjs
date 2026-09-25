// electron/fasting-engine.cjs
// Fasting & Autophagy Engine with 2-Way VPS Sync & Local Offline Resilience
const { EventEmitter } = require('events');
const http = require('http');
const https = require('https');
const { URL } = require('url');

class FastingEngine extends EventEmitter {
  constructor(store, stageDetector, options = {}) {
    super();
    this.store = store;
    this.stageDetector = stageDetector;
    this.vpsUrl = options.vpsUrl || this.store.get('vpsUrl', 'https://brain.doctorbankonline.com');
    
    // Internal state
    this.activeSession = this.store.get('activeSession', null);
    this.currentStatus = this.activeSession ? this.activeSession.session_type : 'fasting';
    this.targetHours = this.activeSession ? (this.activeSession.target_hours || 16.0) : 16.0;
    this.stats = this.store.get('stats', { total_fasting_hours: 0, completed_fasts: 0, current_streak: 0 });
    this.isCloudOnline = true;
    this.serverNowDiffMs = 0;
    this.syncIntervalId = null;
    this.localTickIntervalId = null;
  }

  start() {
    this.syncWithVps();
    // Poll VPS every 60 seconds
    this.syncIntervalId = setInterval(() => this.syncWithVps(), 60000);
    // Local tick every second to keep HUD alive
    this.localTickIntervalId = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    if (this.localTickIntervalId) clearInterval(this.localTickIntervalId);
  }

  // Request helper with timeout
  async request(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      try {
        const fullUrl = new URL(endpoint, this.vpsUrl);
        const isHttps = fullUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          method,
          timeout: 7000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FastingSentinel-Desktop/1.0'
          }
        };

        const req = client.request(fullUrl, options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(parsed);
              } else {
                reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
              }
            } catch (e) {
              reject(new Error(`Invalid JSON: ${body.substring(0, 100)}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('VPS connection timeout'));
        });

        if (data) req.write(JSON.stringify(data));
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async syncWithVps() {
    try {
      const data = await this.request('/api/fasting/status');
      this.isCloudOnline = true;
      if (data) {
        if (data.server_now_utc) {
          this.serverNowDiffMs = new Date(data.server_now_utc).getTime() - Date.now();
        }
        this.activeSession = data.active_session || null;
        this.currentStatus = data.current_status || (this.activeSession ? this.activeSession.session_type : 'fasting');
        this.targetHours = this.activeSession 
          ? (this.activeSession.target_hours || (this.currentStatus === 'fasting' ? 16.0 : 8.0)) 
          : (this.currentStatus === 'fasting' ? 16.0 : 8.0);
        if (data.stats) this.stats = data.stats;

        // Persist to store for offline cache
        this.store.set('activeSession', this.activeSession);
        this.store.set('currentStatus', this.currentStatus);
        this.store.set('stats', this.stats);
      }
      this.emit('state-changed', this.getState());
    } catch (err) {
      // Offline fallback: Use locally cached session
      this.isCloudOnline = false;
      this.emit('state-changed', this.getState());
    }
  }

  tick() {
    const state = this.getState();
    if (this.stageDetector && state.activeSession && !state.isEating) {
      this.stageDetector.evaluate(state.activeSession, state.elapsedSeconds, () => {
        this.emit('stage-action-clicked', state.stage);
      });
    }
    this.emit('tick', state);
  }

  async startSession(sessionType = 'fasting', targetHours = 16.0) {
    const payload = {
      session_type: sessionType,
      target_hours: targetHours,
      started_at_utc: new Date().toISOString()
    };

    try {
      const res = await this.request('/api/fasting/sessions/start', 'POST', payload);
      if (res && res.session) {
        this.activeSession = res.session;
      }
    } catch (err) {
      // Local fallback session if offline
      this.activeSession = {
        id: 'local_' + Date.now(),
        session_type: sessionType,
        target_hours: targetHours,
        started_at_utc: payload.started_at_utc,
        status: 'active'
      };
    }

    this.currentStatus = sessionType;
    this.targetHours = targetHours;
    this.store.set('activeSession', this.activeSession);
    this.store.set('currentStatus', this.currentStatus);
    this.emit('state-changed', this.getState());
    return this.activeSession;
  }

  async endSession() {
    // End current session and toggle into opposite state (matching web master)
    const isEating = this.currentStatus === 'eating' || (this.activeSession && this.activeSession.session_type === 'eating');
    const nextType = isEating ? 'fasting' : 'eating';
    const nextTarget = nextType === 'fasting' ? 16.0 : 8.0;
    return this.startSession(nextType, nextTarget);
  }

  async adjustTime(deltaSeconds) {
    if (!this.activeSession || !this.activeSession.started_at_utc) return;
    const currentStart = new Date(this.activeSession.started_at_utc).getTime();
    const newStart = new Date(currentStart + (deltaSeconds * 1000)).toISOString();

    this.activeSession.started_at_utc = newStart;
    this.store.set('activeSession', this.activeSession);

    try {
      if (!String(this.activeSession.id).startsWith('local_')) {
        await this.request(`/api/fasting/sessions/${this.activeSession.id}`, 'PATCH', {
          started_at_utc: newStart
        });
      }
    } catch (e) {}

    this.emit('state-changed', this.getState());
  }

  getElapsedSeconds() {
    if (!this.activeSession || !this.activeSession.started_at_utc) return 0;
    const startMs = new Date(this.activeSession.started_at_utc).getTime();
    const nowMs = Date.now() + (this.serverNowDiffMs || 0);
    return Math.max(0, Math.floor((nowMs - startMs) / 1000));
  }

  getState() {
    const elapsedSeconds = this.getElapsedSeconds();
    const isEating = this.currentStatus === 'eating' || (this.activeSession && this.activeSession.session_type === 'eating');
    const targetHours = this.targetHours || (isEating ? 8.0 : 16.0);
    const targetSeconds = Math.round(targetHours * 3600);
    const progressPct = targetSeconds > 0 
      ? Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100))
      : 0;

    let stage;
    if (isEating) {
      stage = {
        key: 'eating',
        name: 'Eating Window (Feast)',
        icon: '🍽️',
        color: '#f59e0b',
        gradient: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(6, 10, 19, 0.8) 64%, transparent 100%)'
      };
    } else {
      stage = this.stageDetector 
        ? this.stageDetector.getStage(elapsedSeconds) 
        : { key: 'anabolic', name: 'Digestion / Anabolic', icon: '🧬', color: '#38bdf8' };
    }

    return {
      activeSession: this.activeSession,
      currentStatus: isEating ? 'eating' : 'fasting',
      isEating,
      targetHours,
      targetSeconds,
      elapsedSeconds,
      progressPct,
      stage,
      stats: this.stats,
      isCloudOnline: this.isCloudOnline
    };
  }
}

module.exports = FastingEngine;
