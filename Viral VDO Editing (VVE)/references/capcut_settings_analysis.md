# CapCut Settings Analysis — CLI vs JSON Direct

## สรุปสั้น
`capcut-cli` ครอบคลุมฟีเจอร์ **ระดับ Timeline** (ตัด ต่อ ปรับซีน) ได้ครบถ้วน แต่ **ไม่ครอบคลุมฟีเจอร์ระดับ Material** (หน้าเนียน, Noise Reduction, Color Grading) → ส่วนนี้ต้องเขียน JSON ตรงเข้าไปเอง

---

## ✅ capcut-cli ครอบคลุมแล้ว (ใช้ได้เลย)

| Feature | CLI Command | สถานะ |
|---------|------------|--------|
| **Transition** | `capcut transition <id> <slug>` | ✅ แต่ Minnie transitions (Zoom Shake, Rotate & Change, Get Closer, Zoom Swipe) **ไม่อยู่ใน built-in slug** → ต้องใช้ `resource_id` เขียน JSON ตรง |
| **Speed** | `capcut speed <id> <multiplier>` | ✅ |
| **Volume** | `capcut volume <id> <level>` | ✅ |
| **Opacity** | `capcut opacity <id> <alpha>` | ✅ |
| **Audio Fade** | `capcut audio-fade <id> --in --fade-out` | ✅ |
| **Keyframe** | `capcut keyframe <id> <property> <time> <value>` | ✅ (position/scale/rotation/alpha/volume) |
| **Filter** | `capcut add-filter <slug> <start> <duration>` | ✅ (10 presets: Vintage, Warm, Cool, etc.) |
| **Scene Effects** | `capcut add-effect <slug> <start> <duration>` | ✅ (345 effects!) |
| **Audio Effects** | อยู่ใน enums `--audio-effects` | ✅ (15 presets: Echo, Lo-Fi, Deep, etc.) |
| **Chroma Key** | `capcut chroma <id> --color <hex>` | ✅ |
| **Mask** | `capcut mask <id> <slug>` | ✅ |
| **BG Blur** | `capcut bg-blur <id> <level>` | ✅ |
| **Text Style** | `capcut text-style <id> [options]` | ✅ |
| **Import SRT** | `capcut import-srt <project> <srt>` | ✅ (เราใช้อยู่แล้ว) |
| **Batch Operations** | `capcut batch <project> < ops.jsonl` | ✅ (หลายคำสั่งรวดเดียว) |

---

## ❌ capcut-cli ไม่ครอบคลุม (ต้องเขียน JSON ตรง)

| Feature | JSON Key | ค่าตัวอย่างจาก Draft | แก้ไขด้วย JSON? |
|---------|----------|---------------------|----------------|
| **หน้าเนียน (Beauty Face)** | `videos[].beauty_face_auto_preset` | `{preset_id:"", rate_map:""}` (ปิดอยู่) | ✅ ได้ — ต้องใส่ `preset_id` |
| **ปรับหุ่น (Beauty Body)** | `videos[].beauty_body_auto_preset` | `null` (ปิดอยู่) | ✅ ได้ |
| **Manual Beauty** | `materials.manual_beautys` | `[]` (ว่าง) | ✅ ได้ |
| **Noise Reduction** | `videos[].video_algorithm.noise_reduction` | `null` (ปิดอยู่) | ✅ ได้ |
| **Quality Enhance** | `videos[].video_algorithm.quality_enhance` | `null` (ปิดอยู่) | ✅ ได้ |
| **Super Resolution** | `videos[].video_algorithm.super_resolution` | `null` (ปิดอยู่) | ✅ ได้ |
| **Vocal Beautify** | `materials.vocal_beautifys` | `[]` (ว่าง) | ✅ ได้ |
| **Vocal Separation** | `materials.vocal_separations[].choice` | `0` (ปิดอยู่) | ✅ ได้ |
| **Stabilization** | `videos[].stable.stable_level` | `0` (ปิดอยู่) | ✅ ได้ |
| **Color Grading** | `materials.color_curves`, `hsl`, `hsl_curves` | `[]` (ว่าง) | ✅ ได้ |
| **Smart Relight** | `materials.smart_relights` | `[]` (ว่าง) | ✅ ได้ |
| **Loudness Norm** | `materials.loudnesses[].target_loudness` | `0` (ปิดอยู่) | ✅ ได้ |

---

## 🔑 Minnie Transition Resource IDs (จาก Draft จริง)

เนื่องจาก Minnie transitions ไม่ได้เป็น built-in slug ใน capcut-cli → ต้องเขียนเข้า JSON ตรงด้วย `resource_id`:

| Transition Name | resource_id | Default Duration (μs) |
|----------------|-------------|----------------------|
| **Zoom Shake** | `7290397683808735746` | 666,666 (~0.67s) |
| **Zoom Shake 2** | `7340177833508999681` | 1,000,000 (~1.0s) |
| **Rotate & Change** | `7327547930728993282` | 600,000 (~0.6s) |
| **Get Closer** | `7551232373363379509` | 1,066,666 (~1.07s) |
| **Zoom Swipe** | `7488157742956350737` | 1,000,000 (~1.0s) |
| **Pull Out** | `6724226338418332167` | 466,666 (~0.47s) |

---

## 🏗️ สถาปัตยกรรม: Hybrid Approach

```
┌─────────────────────────────────────────────┐
│              VVE Pipeline                    │
├──────────────────┬──────────────────────────┤
│   capcut-cli     │   Direct JSON Writer     │
│  (Timeline ops)  │  (Material-level ops)    │
├──────────────────┼──────────────────────────┤
│ • import-srt     │ • beauty_face_preset     │
│ • add-video      │ • noise_reduction        │
│ • add-audio      │ • quality_enhance        │
│ • speed          │ • vocal_beautify         │
│ • volume         │ • loudness_norm          │
│ • audio-fade     │ • stabilization          │
│ • add-filter     │ • color_grading          │
│ • add-effect     │ • transitions (Minnie)   │
│ • keyframe       │ • vocal_separation       │
│ • batch          │                          │
└──────────────────┴──────────────────────────┘
         ↓                    ↓
    draft_content.json (CapCut Project)
```

> **สำคัญ:** ต้องปิด CapCut ก่อนเขียน JSON เสมอ เพราะ CapCut จะ lock ไฟล์
