const fs = require('fs');
const text = 'หรือไม่และ ขี้กากหรือว่า';
let result = text.replace(/(?<!ตั้ง)(แต่ว่า|แต่|และ|หรือว่า|หรือ|เพราะว่า|เพราะ|ถ้าเกิด|ถ้าหาก|ถ้า|จึง|เพื่อ|คือ|ดังนั้น)/gu, ' $1');
fs.writeFileSync('electron_test.txt', result.replace(/[ \t]{2,}/g, ' '));
