import { Hono } from 'hono';
import { readFileSync, existsSync } from 'fs';
import { randomBytes, createHmac } from 'crypto';

const authRoutes = new Hono();

function getAuthPassword() {
  try {
    const envPath = new URL('../.env', import.meta.url);
    if (existsSync(envPath)) {
      const env = readFileSync(envPath, 'utf-8');
      const match = env.match(/STOCK_PASSWORD=(.+)/);
      if (match) return match[1].trim();
    }
  } catch (e) {
    console.error("Error reading .env", e);
  }
  return process.env.STOCK_PASSWORD || null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-stock-secret-key-2026';

function signToken(payload) {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 604800000 })).toString('base64url'); // 7 days
  const sig = createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const sig = createHmac('sha256', JWT_SECRET).update(parts[0]).digest('base64url');
  if (sig !== parts[1]) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

const loginAttempts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, time: now };
  if (now - record.time > 15 * 60 * 1000) {
    record.count = 0;
    record.time = now;
  }
  if (record.count >= 10) return false;
  loginAttempts.set(ip, record);
  return true;
}

function failLogin(ip) {
  const record = loginAttempts.get(ip) || { count: 0, time: Date.now() };
  record.count++;
  loginAttempts.set(ip, record);
}

// Authentication Middleware
export const authMiddleware = async (c, next) => {
  // Allow OPTIONS preflight
  if (c.req.method === 'OPTIONS') return await next();
  
  const authHeader = c.req.header('Authorization');
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  c.set('user', payload);
  await next();
};

authRoutes.post('/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || '127.0.0.1';
  
  if (!checkRateLimit(ip)) {
    return c.json({ error: 'Too many attempts. Try again later.' }, 429);
  }

  try {
    const body = await c.req.json();
    const { password } = body;
    const realPassword = getAuthPassword();

    if (!realPassword) {
      console.error("STOCK_PASSWORD is not set in .env");
      return c.json({ error: 'Server configuration error' }, 500);
    }

    if (password === realPassword) {
      const token = signToken({ user: 'admin' });
      return c.json({ ok: true, token });
    } else {
      failLogin(ip);
      return c.json({ error: 'Invalid password' }, 401);
    }
  } catch (e) {
    return c.json({ error: 'Invalid request' }, 400);
  }
});

authRoutes.get('/verify', authMiddleware, (c) => {
  return c.json({ ok: true, user: c.get('user') });
});

export { authRoutes, verifyToken };
