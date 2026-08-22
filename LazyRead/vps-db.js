const express = require('express');
const router = express.Router();
const path = require('path');

let db = null;
try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, 'drview.db');
    db = new Database(dbPath);
    
    // Create table if not exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            content TEXT,
            type TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log("VPS Database initialized at", dbPath);
} catch (e) {
    console.error("Failed to initialize SQLite:", e.message);
}

// Middleware to check API key
const checkAuth = (req, res, next) => {
    // Basic auth check can be implemented here based on config.json
    next();
};

// Return a tree structure of files and folders
router.get('/list', checkAuth, (req, res) => {
    if (!db) return res.status(500).json({ error: "DB not initialized" });
    
    const reqPath = req.query.path || "";
    const normalizedReqPath = reqPath.replace(/\\/g, '/');
    const prefix = normalizedReqPath ? (normalizedReqPath + '/') : '';
    
    try {
        const stmt = db.prepare(`SELECT path FROM documents WHERE path LIKE ?`);
        const rows = stmt.all(prefix + '%');
        
        const itemsMap = new Map(); // name -> { isDirectory }
        
        rows.forEach(row => {
            const relPath = row.path.substring(prefix.length);
            const parts = relPath.split('/');
            if (parts.length === 1) {
                // File
                itemsMap.set(parts[0], { isDirectory: false });
            } else {
                // Directory
                itemsMap.set(parts[0], { isDirectory: true });
            }
        });
        
        const result = [];
        for (const [name, meta] of itemsMap.entries()) {
            if (name === "") continue; // safety
            result.push({
                name: name,
                path: prefix + name,
                isDirectory: meta.isDirectory
            });
        }
        
        // Sort: dirs first
        result.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/read', checkAuth, (req, res) => {
    if (!db) return res.status(500).json({ error: "DB not initialized" });
    
    const reqPath = req.query.path;
    if (!reqPath) return res.status(400).json({ error: "Missing path" });
    
    try {
        const stmt = db.prepare(`SELECT content, type FROM documents WHERE path = ?`);
        const doc = stmt.get(reqPath);
        
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }
        
        res.json({ type: doc.type || 'text', content: doc.content });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/write', checkAuth, (req, res) => {
    if (!db) return res.status(500).json({ error: "DB not initialized" });
    
    const reqPath = req.body.path;
    const content = req.body.content;
    const type = reqPath.split('.').pop().toLowerCase();
    
    if (!reqPath) return res.status(400).json({ error: "Missing path" });
    
    try {
        const id = require('crypto').randomBytes(16).toString('hex');
        
        const stmt = db.prepare(`
            INSERT INTO documents (id, path, content, type, updated_at) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(path) DO UPDATE SET 
                content = excluded.content,
                type = excluded.type,
                updated_at = CURRENT_TIMESTAMP
        `);
        
        stmt.run(id, reqPath, content, type);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Helper route to seed some mock data for testing if DB is empty
router.post('/seed', (req, res) => {
    if (!db) return res.status(500).json({ error: "DB not initialized" });
    try {
        const countStmt = db.prepare('SELECT COUNT(*) as count FROM documents');
        const count = countStmt.get().count;
        if (count === 0) {
            const seedStmt = db.prepare(`INSERT INTO documents (id, path, content, type) VALUES (?, ?, ?, ?)`);
            const tx = db.transaction(() => {
                seedStmt.run('1', 'Welcome.md', '# Welcome to VPS Cloud\nThis is stored in SQLite!', 'md');
                seedStmt.run('2', 'Folder/SubDoc.md', '# Sub Document\nNested folder support works.', 'md');
            });
            tx();
            res.json({ message: "Seeded" });
        } else {
            res.json({ message: "Already has data" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
