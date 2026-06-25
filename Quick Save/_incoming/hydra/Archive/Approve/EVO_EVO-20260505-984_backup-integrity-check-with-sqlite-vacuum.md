---
proposal_id: EVO-20260505-984
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-05-05T02:00:20.069Z
---
# 🚀 Evolution Proposal: Backup Integrity Check with SQLite VACUUM

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** ไฟล์ backup database (brain_20260505_040001.db) มี corruption ภายใน page structure ทำให้ไม่สามารถใช้งานได้เมื่อต้องการ restore ข้อมูล สำคัญคือระบบปัจจุบันไม่มี mechanism ตรวจสอบ integrity ของไฟล์ backup ก่อนที่จะถือว่า backup สำเร็จ

**Description:**
เพิ่มระบบตรวจสอบความสมบูรณ์ของไฟล์ backup database และทำการ VACUUM อัตโนมัติเมื่อพบ corruption เพื่อป้องกันการ restore ข้อมูลเสียหาย

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/hydra/inspector-backup.js` | Add integrity check using SQLite PRAGMA integrity_check before marking backup as complete | high |
| `scripts/hydra/inspector-backup.js` | Implement automatic VACUUM command for corrupted backups to repair database structure | high |
| `scripts/hydra/inspector-backup.js` | Add validation step that retries backup if integrity check fails | high |
| `scripts/watchdog/remediate.js` | Add remediation action for backup corruption findings to trigger repair process | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
