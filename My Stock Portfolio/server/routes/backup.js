import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';
import fs from 'fs';
import path from 'path';

const backupRoutes = new Hono();
backupRoutes.use('*', authMiddleware);

backupRoutes.get('/', (c) => {
  try {
    const backups = db.prepare(`SELECT id, backup_name, backup_type, created_at FROM backups ORDER BY created_at DESC LIMIT 20`).all();
    return c.json(backups);
  } catch (error) {
    return c.json({ error: 'Failed to fetch backups' }, 500);
  }
});

backupRoutes.post('/', async (c) => {
  try {
    // Generate a full JSON dump of the DB
    const portfolios = db.prepare(`SELECT * FROM portfolios`).all();
    const transactions = db.prepare(`SELECT * FROM transactions`).all();
    
    const dump = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        portfolios,
        transactions
      }
    };
    
    const backupName = `backup_${Date.now()}.json`;
    
    db.prepare(`INSERT INTO backups (backup_name, backup_data, backup_type) VALUES (?, ?, ?)`).run(
      backupName, JSON.stringify(dump), 'manual'
    );
    
    return c.json({ success: true, name: backupName });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to create backup' }, 500);
  }
});

export { backupRoutes };
