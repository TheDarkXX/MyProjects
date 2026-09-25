// electron/store.cjs
// Zero-dependency local persistent JSON store for FastingTimer
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class SimpleStore {
  constructor(defaults = {}) {
    const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
    if (!fs.existsSync(userDataPath)) {
      try { fs.mkdirSync(userDataPath, { recursive: true }); } catch (e) {}
    }
    this.filePath = path.join(userDataPath, 'config.json');
    this.data = { ...defaults };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf8');
        this.data = { ...this.data, ...JSON.parse(content) };
      }
    } catch (err) {
      console.error('[Store] Failed to load config:', err.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[Store] Failed to save config:', err.message);
    }
  }

  get(key, defaultValue = null) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }
}

module.exports = SimpleStore;
