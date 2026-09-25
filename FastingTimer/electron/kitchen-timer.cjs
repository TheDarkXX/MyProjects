// electron/kitchen-timer.cjs
// High-Precision Kitchen & Egg Countdown Timer Engine (Sleep/Wake Proof via Target UTC)
const { EventEmitter } = require('events');

class KitchenTimer extends EventEmitter {
  constructor(notifier) {
    super();
    this.notifier = notifier;
    this.name = 'ต้มไข่';
    this.durationSeconds = 8 * 60; // Default: 8 min
    this.remainingSeconds = this.durationSeconds;
    this.targetEndTimeUtc = null;
    this.isRunning = false;
    this.isCompleted = false;
    this.intervalId = null;
  }

  start(name = 'ต้มไข่', durationSeconds = 8 * 60) {
    this.name = name;
    this.durationSeconds = durationSeconds;
    this.remainingSeconds = durationSeconds;
    this.targetEndTimeUtc = Date.now() + (durationSeconds * 1000);
    this.isRunning = true;
    this.isCompleted = false;

    this.startTicker();
    this.emit('state-changed', this.getState());
  }

  startTicker() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  tick() {
    if (!this.isRunning || !this.targetEndTimeUtc) return;

    const now = Date.now();
    const diffSeconds = Math.round((this.targetEndTimeUtc - now) / 1000);

    if (diffSeconds <= 0) {
      this.remainingSeconds = 0;
      this.isRunning = false;
      this.isCompleted = true;
      if (this.intervalId) clearInterval(this.intervalId);

      // Trigger Native Toast Notification
      if (this.notifier) {
        const minsStr = this.durationSeconds >= 60 
          ? `${Math.round(this.durationSeconds / 60)} นาที` 
          : `${this.durationSeconds} วินาที`;
        this.notifier.notifyKitchenTimerDone(this.name, minsStr, () => {
          // Callback when Boss clicks "+2 minutes" button in Toast
          this.addSeconds(120);
        });
      }

      this.emit('completed', this.getState());
      this.emit('state-changed', this.getState());
    } else {
      this.remainingSeconds = diffSeconds;
      this.emit('tick', this.getState());
    }
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.emit('state-changed', this.getState());
  }

  resume() {
    if (this.isRunning || this.remainingSeconds <= 0) return;
    this.targetEndTimeUtc = Date.now() + (this.remainingSeconds * 1000);
    this.isRunning = true;
    this.startTicker();
    this.emit('state-changed', this.getState());
  }

  stop() {
    this.isRunning = false;
    this.isCompleted = false;
    this.targetEndTimeUtc = null;
    this.remainingSeconds = this.durationSeconds;
    if (this.intervalId) clearInterval(this.intervalId);
    this.emit('state-changed', this.getState());
  }

  addSeconds(extraSeconds = 120) {
    if (this.isCompleted || !this.isRunning) {
      this.start(this.name, extraSeconds);
    } else {
      this.durationSeconds += extraSeconds;
      this.targetEndTimeUtc += (extraSeconds * 1000);
      this.tick();
    }
  }

  reconcileAfterResume() {
    // Called after system wake from sleep/hibernate
    if (this.isRunning && this.targetEndTimeUtc) {
      this.tick();
    }
  }

  getState() {
    return {
      name: this.name,
      durationSeconds: this.durationSeconds,
      remainingSeconds: this.remainingSeconds,
      isRunning: this.isRunning,
      isCompleted: this.isCompleted,
      progressPct: this.durationSeconds > 0 
        ? Math.min(100, Math.round(((this.durationSeconds - this.remainingSeconds) / this.durationSeconds) * 100))
        : 0
    };
  }
}

module.exports = KitchenTimer;
