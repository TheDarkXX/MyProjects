import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('better-sqlite3')('/root/stock-portfolio/server/db/portfolio.db');
console.log(JSON.stringify(db.prepare("PRAGMA table_info(chart_drawings)").all()));
db.close();
