# Auto-Extracted Rules & Preferences

- **MANDATORY AUTO-DEPLOY & PUSH (NON-NEGOTIABLE)**: Whenever ANY code modification is completed, IMMEDIATELY execute the full deployment and push pipeline:
  1. `npm run build`
  2. `node bump-cache.js`
  3. `scp -r dist/* root@185.250.38.247:/root/stock-portfolio/dist/`
  4. `ssh root@185.250.38.247 "bash -lc 'pm2 reload stock-api'"`
  5. `git add . && git commit -m "..." && git push origin master`
  DO NOT stop or finish the turn without pushing. The user must NEVER have to remind you to push.
- **No Browser Subagent Testing Unless Explicitly Commanded**: หลังเขียนโค้ดและดีพลอยเสร็จ ห้ามเปิด browser subagent เพื่อทดสอบหน้าเว็บเองเด็ดขาด ถ้าผู้ใช้ไม่ได้พิมพ์สั่งให้เปิดเบราว์เซอร์เทสอย่างชัดเจน เพราะทำให้เสียเวลาและอาจติดปัญหา auth/rate-limit. ให้ยืนยันความถูกต้องผ่าน `npx tsc --noEmit`, `npm run build`, และ Code Inspection โดยตรงเท่านั้น
