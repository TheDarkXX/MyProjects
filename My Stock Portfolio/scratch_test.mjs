import { db } from './server/db/init.js';
console.log(db.prepare(`SELECT id, headline_th, length(full_content) as len FROM news_intelligence WHERE headline LIKE '%Broadcom CEO Doubles Down%'`).all());
