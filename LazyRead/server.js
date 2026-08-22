const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3700;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

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

app.post('/api/config/add-folder', (req, res) => {
    const { name, path: folderPath } = req.body;
    if (!name || !folderPath) return res.status(400).json({ error: 'Missing name or path' });
    
    const configPath = path.join(__dirname, 'config.json');
    let config = { sources: [] };
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    const localVault = config.sources.find(s => s.id === 'local-vault');
    if (localVault) {
        if (!localVault.roots) localVault.roots = [];
        localVault.roots.push({ name: name, path: folderPath.replace(/\\/g, '/') });
    } else {
        config.sources.unshift({
            id: 'local-vault',
            name: 'คอมพิวเตอร์',
            type: 'local',
            roots: [{ name: name, path: folderPath.replace(/\\/g, '/') }]
        });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    res.json({ success: true });
});

// --- Local API ---
app.use('/api/local', require('./local'));

// --- VPS DB API (Phase 2) ---
app.use('/api/vps-db', require('./vps-db'));

// Fallback to index.html for SPA routing if needed
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

function startServer() {
    return new Promise((resolve) => {
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`LazyRead running at http://localhost:${PORT}`);
            resolve(PORT);
        });
    });
}

// If run directly (node server.js), start it and open chrome
if (require.main === module) {
    startServer().then(port => {
        const { exec } = require('child_process');
        exec(`start chrome --app=http://localhost:${port} --window-size=1400,900`, (err) => {
            if (err) console.error("Failed to open Chrome automatically.", err.message);
        });
    });
}

module.exports = { app, startServer };
