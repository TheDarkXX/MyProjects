---
version: "draft"
type: study
status: icebox
outcome: deferred
date: 2026-05-16
brain_task_id: ~
source: dev-agent
tags: [ai, omniclaw, reality-engine, ag-gepa, facebook-api]
conversation: "718edc46-503e-4824-a740-48a18d88eea2"
conversation_title: "Hydra Proposal Review"
related_plans_same_conversation:
  - "V12.7.14_[hotfix]_maintain_error-logging.md"
  - "EVO-7899_[study]_maintain_routine-id.md"
  - "EVO-8197_[study]_enhance_gepa-json-repair.md"
related:
  - "scripts/cron-viral-analytics.js"
  - "routes/mc-worker.js"
summary: >
  Steve Jobs-level vision: Project OMNICLAW. A closed-loop reality engine that evolves AI personas based on real-time FB API retention curves and comment sentiment. Feasibility verified against Graph API v25.0. Deferred to Icebox by user.
---

# DEV-195: OMNICLAW - The Closed-Loop Reality Engine

## 📌 Context (Compiled Truth)
The user asked for a "Steve Jobs level idea" to elevate the OpenClaw VPS and Viral Planner ecosystem. We proposed **OMNICLAW: The Sentient Brand**. Instead of manually triggering agents, the system becomes a closed-loop reality engine:
1. **Sensory Network:** Reads Facebook Reels retention curves (40 segments) and comment sentiment via Graph API. Goal: Zero-Guesswork Content based on empirical data.
2. **Darwinian Evolution:** Feeds the real-world performance back into AG-GEPA to mutate and evolve its own persona/prompts autonomously. Goal: Self-Improving Content Engine.
3. **Ambient OS & Digital Twin:** A "Super Brain" that acts as a RAG layer over `brain.db` (notes, journal, memories) + 300-500+ cross-PC AG conversation logs (HOME + OFFICE). Goal: Allow the user to consult their own historical knowledge base effortlessly, rather than acting as a customer-facing chatbot.

**UI Strategy:** Instead of building a new app, OMNICLAW UI will be seamlessly integrated into existing Brain App modules:
- Reel Analytics (Retention & Sentiment) -> **Mission Control tab**
- DNA & Mutation Tracking -> **Hydra/EVO tab**

A deep feasibility study was conducted. Facebook Graph API v25.0 fully supports fetching `post_video_retention_graph`, `post_video_social_actions`, and `/{post-id}/comments`. TikTok API is more restricted. The core blocker identified is an expired FB Access Token. The user decided to save this for later ("เก็บไว้ก่อน เดวค่อยมาทำ"), so it is placed in the Icebox.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)

<details>
<summary>Click to view the full OMNICLAW Feasibility Study</summary>

# 🔬 OMNICLAW Feasibility Study: Sensory Network & Darwinian Evolution

> Deep-dive into what Facebook/TikTok APIs **actually** give us vs. what we imagined

---

## Executive Summary

| Component | Verdict | Confidence |
|---|---|---|
| **1. Sensory Network (FB Reels)** | ✅ **FEASIBLE — ทำได้จริง 85%** | High |
| **2. Sensory Network (TikTok)** | ⚠️ **PARTIAL — ได้แค่บางส่วน** | Medium |
| **3. Darwinian Persona Evolution** | ✅ **FEASIBLE — ทำได้ทันที** | High |
| **4. Digital Twin** | ✅ **FEASIBLE — มี data พร้อม** | High |

---

## 1. Sensory Network — Facebook Reels (หลัก)

### ✅ สิ่งที่ Graph API ให้จริง (Confirmed from Official Docs v25.0)

เราอ่าน official docs ของ Meta ตรงๆ จาก `developers.facebook.com` แล้ว นี่คือข้อมูลที่ API ให้จริง:

#### Reels-Specific Metrics (ใช้ `/{video-id}/video_insights`)

| Metric | ชื่อ API | ได้อะไร | ใช้ทำอะไรใน OMNICLAW |
|---|---|---|---|
| ▶️ Play Count | `blue_reels_play_count` | จำนวนครั้งที่เล่น (≥1ms) | วัด reach จริง |
| 🔁 Replay Count | `fb_reels_replay_count` | จำนวนครั้งที่ดูซ้ำ | วัด "addictiveness" |
| ⏱️ Avg Watch Time | `post_video_avg_time_watched` | avg มิลลิวินาทีที่ดู (รวม replay) | วัดว่าคลิปดึงดูดแค่ไหน |
| 📊 **Retention Curve** | `post_video_retention_graph` | **% คนดูในแต่ละช่วงเวลา (40 segments)** | **🔑 KEY DATA — รู้ว่าคนเลิกดูตรงไหน!** |
| ⏱️ Total Watch Time | `post_video_view_time` | เวลาดูรวมทั้งหมด (ms) | วัด total engagement |
| 👥 Reach | `post_impressions_unique` | จำนวนคนที่เห็น (unique) | วัด distribution |
| 💬 Social Actions | `post_video_social_actions` | comments + shares | วัด virality |
| 👆 Follows | `post_video_followers` | จำนวน follow จากคลิปนี้ | วัด conversion |
| ❤️ Reactions by Type | `post_video_likes_by_reaction_type` | Like/Love/Wow/Sad/Angry แยกประเภท | **Sentiment proxy!** |

#### Video-Specific Metrics (ได้ด้วย)

| Metric | ชื่อ API | ได้อะไร |
|---|---|---|
| 📊 **Retention Curve (Video)** | `total_video_retention_graph` | **กราฟ retention 40 จุด** |
| 📊 Retention (Autoplay) | `total_video_retention_graph_autoplayed` | retention เฉพาะ autoplay |
| 📊 Retention (Click-to-play) | `total_video_retention_graph_clicked_to_play` | retention เฉพาะคนคลิกเล่นเอง |
| 👫 Demographics | `total_video_view_time_by_age_bucket_and_gender` | เวลาดูแยกตาม อายุ×เพศ |
| 🌍 Geography | `total_video_view_time_by_region_id` | เวลาดูแยกตาม Top 45 ภูมิภาค |
| 📢 Distribution | `total_video_views_by_distribution_type` | views จาก page_owned vs shared |
| 🔇 Sound On | `total_video_views_sound_on` | คนเปิดเสียงดูกี่คน |

#### Comments & Reactions (ใช้ `/{post-id}/comments`)

| Data | Endpoint | ได้อะไร |
|---|---|---|
| 💬 Comments | `GET /{post-id}/comments` | **ข้อความคอมเมนต์จริงทุกอัน** |
| ❤️ Reactions | `GET /{post-id}/reactions` | จำนวน + ประเภท reactions |
| 🔁 Shares | `GET /{post-id}?fields=shares` | จำนวนแชร์ |

#### Real-time Updates (Webhooks)

| Feature | วิธีทำ | สิ่งที่ต้องมี |
|---|---|---|
| 📡 Comment Webhook | Subscribe `feed` field | HTTPS endpoint + `pages_manage_metadata` |
| ⚡ Real-time Comments | Meta pushes ทุกครั้งที่มี comment ใหม่ | Hono server รับ webhook ได้เลย |

### ⚠️ สิ่งที่ API ไม่ให้ (Limitations)

| สิ่งที่อยากได้ | สถานะ | ทางเลือก |
|---|---|---|
| ❌ Per-second drop-off | **ไม่มี** — ได้แค่ 40 segments | 40 segments เพียงพอสำหรับ analysis |
| ❌ Individual viewer behavior | **ไม่มี** — ได้แค่ aggregate | เพียงพอสำหรับ pattern detection |
| ⚠️ Deprecation June 2026 | บาง metrics จะเปลี่ยนชื่อ | ต้อง migrate ไป "Media Views" framework |

### 🔑 Permission ที่ต้องมี (FB)

| Permission | สถานะในระบบเรา | ต้องทำอะไร |
|---|---|---|
| `pages_read_engagement` | ✅ มีแล้ว (ใช้ใน Graph posting) | ไม่ต้องทำอะไร |
| `read_insights` | ⚠️ ต้องเช็ค | ต้องขอผ่าน App Review |
| `pages_manage_metadata` | ⚠️ ต้องเพิ่ม (สำหรับ Webhook) | ต้องขอผ่าน App Review |

---

## 2. Sensory Network — TikTok

### ⚠️ สถานการณ์ TikTok API (พฤษภาคม 2026)

| Access Level | ข้อมูลที่ได้ | ใครใช้ได้ |
|---|---|---|
| **Business API** | Views, likes, comments, shares, watch time, demographics | ✅ Business Account |
| **Content Posting API** | Publish/Schedule only | ✅ Enterprise partners |
| **Research API** | Public data for academic use | ❌ ต้องเป็นสถาบันวิจัย |
| **Native Dashboard** | **Full data** (avg watch time, completion rates, demographics) | ✅ ทุกคน (แต่ manual) |

### TikTok Verdict

| Feature | ทำได้ไหม | วิธี |
|---|---|---|
| Views/Likes/Shares | ✅ ได้ | Business API (ต้อง apply) |
| Watch Time/Completion | ✅ ได้ | Business API |
| Comments (อ่านข้อความ) | ❌ **ไม่ได้** ผ่าน API | ต้องใช้ 3rd party scraper (เสี่ยง ToS) |
| Retention Curve | ⚠️ Aggregate only | ไม่ละเอียดเท่า FB |

> **ข้อเสนอ:** โฟกัส Facebook เป็นหลักก่อน (เพราะเราควบคุม API ได้เต็มที่ + มี posting pipeline อยู่แล้ว) ค่อยขยายไป TikTok ทีหลัง

---

## 3. Darwinian Persona Evolution — Feasibility

### ✅ ทำได้ทันที เพราะ:

**เรามีทุกชิ้นส่วนอยู่แล้ว — แค่ต่อท่อเข้าด้วยกัน:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 DARWINIAN EVOLUTION LOOP                        │
│                                                                 │
│  [1] SENSE (Sensory Network)                                   │
│      ├─ Retention Curve (40 segments per reel)                 │
│      ├─ Comments text → AI Sentiment Analysis                  │
│      ├─ Reactions by type (Love vs Angry)                      │
│      └─ Watch Time + Replay Count                              │
│                          │                                      │
│                          ▼                                      │
│  [2] ANALYZE (AI Judge)                                        │
│      ├─ "คลิปนี้ retention ตกที่ segment 15 = วินาทีที่ 22"    │
│      ├─ "คอมเมนต์ 73% positive, 15% ask question"             │
│      ├─ "Replay สูง = hook ดี, แต่ completion ต่ำ = ยาวไป"    │
│      └─ Compile เป็น "Evolution Fitness Score"                 │
│                          │                                      │
│                          ▼                                      │
│  [3] MUTATE (AG-GEPA Engine Revival)                           │
│      ├─ ดึง top-3 performing prompts/scripts                   │
│      ├─ Crossover: ผสมจุดเด่นของคลิปที่ดี                     │
│      ├─ Mutation: ปรับ hook/length/tone ตาม fitness score       │
│      └─ Generate 2-3 variant scripts                           │
│                          │                                      │
│                          ▼                                      │
│  [4] SELECT (Pareto Selection)                                 │
│      ├─ โพสต์ variant ทั้งหมด (A/B test จริง)                  │
│      ├─ วัดผล 48 ชั่วโมง → Fitness Score ใหม่                  │
│      └─ ตัว DNA ที่ชนะ → เข้าเป็น parent รุ่นถัดไป             │
│                                                                 │
│  ═══════════════ วนลูปไม่มีวันจบ ═══════════════               │
└─────────────────────────────────────────────────────────────────┘
```

### สิ่งที่มีอยู่แล้วในระบบ vs. สิ่งที่ต้องสร้างใหม่

| Component | สถานะ | อ้างอิง |
|---|---|---|
| ✅ FB Graph API Posting | **มีแล้ว** | `cron-fb-graph-post.js`, `mission-control.js` |
| ✅ FB Analytics Fetcher | **มีแล้ว** (แต่ basic) | `cron-viral-analytics.js`, `mc-worker.js` |
| ✅ AI Content Generation | **มีแล้ว** | MC Worker → Gemini 2.5 Flash |
| ✅ Auto-comment Pipeline | **มีแล้ว** | `cron-fb-autocomment.js` |
| ✅ AG-GEPA Architecture | **มีแล้ว** (V7.8.0) แต่ถูกลบไปใน V12.2.0 | ต้อง revive + upgrade |
| ⬜ Retention Curve Fetcher | **ต้องสร้าง** | เพิ่ม `post_video_retention_graph` metric |
| ⬜ Comment Sentiment Analyzer | **ต้องสร้าง** | Pull comments → Gemini classify |
| ⬜ Fitness Score Calculator | **ต้องสร้าง** | Weighted score จาก retention + sentiment + engagement |
| ⬜ Evolution Loop Orchestrator | **ต้องสร้าง** | Cron ที่ connect ทุกอย่างเข้าด้วยกัน |
| ⬜ Webhook Listener (Optional) | **ต้องสร้าง** | สำหรับ real-time comment alerts |

---

## 4. Digital Twin — Feasibility

### ✅ ทำได้เลย เพราะ data พร้อมทั้งหมด

| Data Source | อยู่ไหน | ปริมาณ |
|---|---|---|
| 📝 Notes (ความรู้สุขภาพ) | `brain.db → notes` | Active |
| 📓 Journal (ไดอารี่) | `brain.db → journal` | Active |
| 🧠 Memories (preferences/rules) | `brain.db → memories` | Active |
| 📋 Content Plans | `brain.db → content_plans` | Active |
| 💬 AG Conversation Logs | `Quick Save/`, KI | Extensive |
| 📚 Knowledge Base | `docs/` | Growing |

### Implementation Path

| Phase | วิธี | Effort |
|---|---|---|
| **Phase 1: RAG** | Export brain.db → embeddings → Gemini context | 🟢 Low (2-3 ชม.) |
| **Phase 2: Persona Prompt** | สร้าง system prompt จาก memories + writing style | 🟢 Low (1-2 ชม.) |
| **Phase 3: Interactive Clone** | Discord/Web chat ที่ตอบแบบ "Digital Twin" | 🟡 Medium (4-6 ชม.) |
| **Phase 4: Auto-Sales** | Clone ตอบ DM/comment แบบอัตโนมัติ | 🔴 High (ต้อง test มาก) |

---

## 🚨 Blockers & Risks ที่ต้องรู้

### Critical Blocker: FB Token Expiry

> [!CAUTION]
> จาก PM2 error log ล่าสุด: **FB Access Token หมดอายุแล้ว!**
> ```
> [Send to FB Error] FB Init: {"message":"Error validating access token: 
> Session has expired on Friday, 08-May-26 00:00:00 PDT."}
> ```
> **ต้อง renew token ก่อนจะทำอะไรทั้งหมดเลย!**

### Other Risks

| Risk | Level | Mitigation |
|---|---|---|
| FB Token Expiry (60 days) | 🔴 High | ตั้ง cron เตือน 7 วันก่อนหมดอายุ |
| Metric Deprecation (June 2026) | 🟡 Medium | ใช้ new "Media Views" framework |
| API Rate Limits | 🟢 Low | เราโพสต์ไม่เยอะ |
| TikTok API access denied | 🟡 Medium | โฟกัส FB ก่อน |

---

## 📋 Recommended Execution Order

| Phase | สิ่งที่ทำ | Prerequisites | Effort |
|---|---|---|---|
| **0** | 🔑 Renew FB Access Token | - | 15 นาที |
| **1** | 📊 Upgrade Analytics Fetcher (เพิ่ม retention + comments) | Phase 0 | 2-3 ชม. |
| **2** | 🧠 Build Fitness Score Calculator | Phase 1 | 2-3 ชม. |
| **3** | 🧬 Revive AG-GEPA with real data input | Phase 2 | 4-6 ชม. |
| **4** | 🔄 Wire Evolution Loop (auto-mutate scripts) | Phase 3 | 3-4 ชม. |
| **5** | 🤖 Digital Twin v1 (RAG + Persona) | Phase 0 | 3-4 ชม. |

**Total estimated: ~15-20 ชั่วโมงทำงาน spread over 1-2 สัปดาห์**
</details>

## 🔬 Timeline & Debugging Log
- **2026-05-16 10:35**: Formulated idea and deep feasibility study based on Graph API docs. Confirmed metrics like `post_video_retention_graph` are accessible. User requested to save to Icebox for future implementation.
- **2026-05-16 11:20**: Clarified Digital Twin objective. It is NOT an auto-reply chatbot (since we lack Messenger API/Inbox infrastructure), but rather a "Super Brain" / Personal RAG built on top of `brain.db` and cross-PC AG conversation logs. Discovered that conversation logs are split between HOME (estimated 200-400+ logs) and OFFICE (102 logs), which must be merged before building the Twin.

## 🔗 GBRAIN Backlinks
- **2026-05-16 10:35** | [V10.6.0_[impl]_hydra_viral-clip-cloning-pipeline.md](Quick Save/Icebox/V10.6.0_[impl]_hydra_viral-clip-cloning-pipeline.md) -- Related to automated viral pipelines and AI generation.
- **2026-05-16 10:35** | [DEV-194_[study]_agent_understand-anything.md](Quick Save/Icebox/DEV-194_[study]_agent_understand-anything.md) -- Precursor to ambient AI interaction.
