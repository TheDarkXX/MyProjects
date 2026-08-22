const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const getConfig = () => {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return { sources: [] };
};

// Validate that a path is within one of the local roots
function validatePath(reqPath) {
    if (!reqPath) return null;
    const config = getConfig();
    const localSource = config.sources.find(s => s.type === 'local');
    if (!localSource || !localSource.roots) return null;

    const normalizedReq = path.normalize(reqPath).replace(/\\/g, '/');
    
    for (const root of localSource.roots) {
        const normalizedRoot = path.normalize(root.path).replace(/\\/g, '/');
        if (normalizedReq.startsWith(normalizedRoot)) {
            return normalizedReq;
        }
    }
    return null;
}

router.get('/list', (req, res) => {
    const dirPath = validatePath(req.query.path);
    if (!dirPath) {
        return res.status(403).json({ error: "Access denied or invalid path" });
    }

    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = items.map(item => ({
            name: item.name,
            path: path.join(dirPath, item.name).replace(/\\/g, '/'),
            isDirectory: item.isDirectory()
        }));
        // Sort: directories first, then files alphabetically
        result.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/read', (req, res) => {
    const filePath = validatePath(req.query.path);
    if (!filePath) {
        return res.status(403).json({ error: "Access denied or invalid path" });
    }

    try {
        const ext = path.extname(filePath).toLowerCase();
        const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
        
        if (imageExts.includes(ext)) {
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');
            const mime = ext === '.svg' ? 'image/svg+xml' : `image/${ext.replace('.', '')}`;
            res.json({ type: 'image', content: `data:${mime};base64,${base64}` });
        } else {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ type: 'text', content: content });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/write', (req, res) => {
    const filePath = validatePath(req.body.path);
    if (!filePath) {
        return res.status(403).json({ error: "Access denied or invalid path" });
    }

    try {
        fs.writeFileSync(filePath, req.body.content, 'utf8');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
