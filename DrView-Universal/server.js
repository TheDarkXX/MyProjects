const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3700;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Read config
const getConfig = () => {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return { sources: [] };
};

// --- Config API ---
app.get('/api/sources', (req, res) => {
    res.json(getConfig());
});

// --- Local API ---
app.use('/api/local', require('./adapters/local'));

// --- VPS DB API (Phase 2) ---
app.use('/api/vps-db', require('./adapters/vps-db'));

// Fallback to index.html for SPA routing if needed
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`LazyRead running at http://localhost:${PORT}`);
    
    // Auto-open in Chrome App Mode
    const { exec } = require('child_process');
    // Using start command on Windows to open Chrome in app mode
    exec(`start chrome --app=http://localhost:${PORT} --window-size=1400,900`, (err) => {
        if (err) console.error("Failed to open Chrome automatically.", err.message);
    });
});
