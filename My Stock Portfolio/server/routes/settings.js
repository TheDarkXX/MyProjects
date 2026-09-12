import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

export const settingsRoutes = new Hono();

// Require auth for all settings endpoints
settingsRoutes.use('*', authMiddleware);

/**
 * GET /api/settings
 * Returns all user settings as a key-value dictionary with timestamps
 */
settingsRoutes.get('/', async (c) => {
  try {
    const rows = db.prepare(`
      SELECT setting_key, setting_value, updated_at
      FROM user_settings
    `).all();

    const settings = {};
    for (const row of rows) {
      let parsedValue = null;
      try {
        parsedValue = JSON.parse(row.setting_value);
      } catch (e) {
        parsedValue = row.setting_value;
      }
      settings[row.setting_key] = {
        value: parsedValue,
        updated_at: row.updated_at,
      };
    }

    return c.json({
      success: true,
      settings,
    });
  } catch (err) {
    console.error('[Settings API] GET / Error:', err);
    return c.json({ error: 'Failed to fetch settings', message: err.message }, 500);
  }
});

/**
 * GET /api/settings/:key
 * Returns a specific setting by key
 */
settingsRoutes.get('/:key', async (c) => {
  try {
    const rawKey = c.req.param('key');
    if (!rawKey || rawKey.trim() === '') {
      return c.json({ error: 'Setting key is required' }, 400);
    }
    const key = rawKey.trim();

    const row = db.prepare(`
      SELECT setting_key, setting_value, updated_at
      FROM user_settings
      WHERE setting_key = ?
    `).get(key);

    if (!row) {
      return c.json({
        success: true,
        setting: null,
      });
    }

    let parsedValue = null;
    try {
      parsedValue = JSON.parse(row.setting_value);
    } catch (e) {
      parsedValue = row.setting_value;
    }

    return c.json({
      success: true,
      setting: {
        key: row.setting_key,
        value: parsedValue,
        updated_at: row.updated_at,
      },
    });
  } catch (err) {
    console.error(`[Settings API] GET /:key (${c.req.param('key')}) Error:`, err);
    return c.json({ error: 'Failed to fetch setting', message: err.message }, 500);
  }
});

/**
 * POST /api/settings/:key
 * Atomic Upsert for a setting key
 */
settingsRoutes.post('/:key', async (c) => {
  try {
    const rawKey = c.req.param('key');
    if (!rawKey || rawKey.trim() === '') {
      return c.json({ error: 'Setting key is required' }, 400);
    }
    const key = rawKey.trim();

    const body = await c.req.json();
    if (body === undefined || body.value === undefined) {
      return c.json({ error: 'Payload must contain a "value" property' }, 400);
    }

    const serializedValue = typeof body.value === 'string'
      ? body.value
      : JSON.stringify(body.value);

    const stmt = db.prepare(`
      INSERT INTO user_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = datetime('now')
    `);

    stmt.run(key, serializedValue);

    return c.json({
      success: true,
      key,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[Settings API] POST /:key (${c.req.param('key')}) Error:`, err);
    return c.json({ error: 'Failed to save setting', message: err.message }, 500);
  }
});

/**
 * DELETE /api/settings/:key
 * Removes a specific setting
 */
settingsRoutes.delete('/:key', async (c) => {
  try {
    const rawKey = c.req.param('key');
    if (!rawKey || rawKey.trim() === '') {
      return c.json({ error: 'Setting key is required' }, 400);
    }
    const key = rawKey.trim();

    db.prepare(`
      DELETE FROM user_settings
      WHERE setting_key = ?
    `).run(key);

    return c.json({
      success: true,
      key,
    });
  } catch (err) {
    console.error(`[Settings API] DELETE /:key (${c.req.param('key')}) Error:`, err);
    return c.json({ error: 'Failed to delete setting', message: err.message }, 500);
  }
});
