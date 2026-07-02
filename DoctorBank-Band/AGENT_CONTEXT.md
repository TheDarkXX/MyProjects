# 💊 DoctorBank Band — Agent Navigator

> **อ่านไฟล์นี้ก่อนเสมอ** เมื่อ Agent Focus Lock มาที่โปรเจกต์นี้

## 🎯 Project Overview
- **DoctorBank Band** คือโปรเจกต์ Brand/Business ของ Doctor Bank (พี่แบงค์)
- เป้าหมาย: วางแผนสินค้า สร้างแบรนด์ การขายสินค้าแบบครบ loop
- อุตสาหกรรม: อาหารเสริม (Supplement) + Health Content
- **Location:** `c:\My Claw\MyProjects\DoctorBank-Band\`
- **Environment:** Git (via MyProjects umbrella repo)

## 📦 Products (Sub-projects)

| Product | Path | สถานะ |
|---------|------|-------|
| **Magnesium Night Plus** | `Products/Magnesium-Night-Plus/` | 🟡 Pre-launch |

## 📜 Memory Inheritance

```
🌍 Global: Openclaw-VPS/AGENTS.md
    ↓
🏠 Root: MyProjects/AGENT_CONTEXT.md (Focus Protocol)
    ↓
💊 Project: memory.md (กฎเฉพาะ DoctorBank Band) ← คุณอยู่ที่นี่
    ↓
📦 Product: Products/[name]/PRODUCT_MEMORY.md
```

## ✍️ Writing Style Registry

> เมื่อ User สั่ง `/drbpost [style] [หัวข้อ]` → AI ไปอ่าน **Blueprint** ของ Style นั้น
> Blueprint = สูตรเขียนทั้งหมด (แกะจากเพจต้นแบบ) จบครบในไฟล์เดียว

| Style ID | ต้นแบบจากเพจ | Blueprint | Default? |
|---|---|---|---|
| `winbiz` | BestWinbiz | `Content/Writing/Styles/Health_Supplement_Winbiz_Style/Blueprints/Health_Supplement_Writing_Blueprint.md` | ✅ |
| `drjade` | drjadehealth (หมอเจด) | `Content/Writing/Styles/DR_Jade_Health_Style/Blueprints/DR_Jade_Health_Writing_Blueprint.md` | |

> **เพิ่ม Style ใหม่:** clone จากเพจใหม่ → สร้างโฟลเดอร์ + Blueprint → เพิ่มรายการในตารางนี้ + ใน SKILL.md

## 🛠️ Skill Index — คำสั่งทั้งหมดของโปรเจกต์นี้

| คำสั่ง | หน้าที่ | ไฟล์ Skill | หมวด |
|---|---|---|---|
| **`/drbpost`** | เขียนโพสต์ (Multi-Style) | [SKILL.md](.agents/skills/post/SKILL.md) | ✍️ Writing |
| **`/clonepost`** | แกะสไตล์เขียนจากเพจต้นแบบ (CSV/Excel/TXT) | [SKILL.md](.agents/skills/clonepost/SKILL.md) | 🔬 Analysis |
| **`/cons`** | หา evidence จากเปเปอร์ (Consensus MCP) | *Built-in MCP* | 📚 Research |
| **`/deep`** / **`/res`** | หาอ้างอิงระดับลึก (80+ citations) | [medical_research.py](gpt-researcher/medical_research.py) | 📚 Research |

## 📂 โครงสร้างโฟลเดอร์หลัก

```
DoctorBank-Band/
├── .agents/skills/          ← 🛠️ AI Skills (คำสั่ง /slash)
│   ├── post/SKILL.md            → /drbpost
│   └── clonepost/SKILL.md       → /clonepost
├── AGENT_CONTEXT.md         ← 📍 คุณอยู่ที่นี่
├── memory.md                ← ⚖️ กฎเหล็ก (Iron Rules)
├── Brand/                   ← 🏷️ Brand Identity + Memory
├── Products/                ← 📦 สินค้า (แต่ละตัวมี PRODUCT_MEMORY.md)
├── Content/                 ← ✍️ เนื้อหาทั้งหมด
│   └── Writing/Styles/          → Style Registry (Blueprint ของแต่ละเพจ)
├── Sales/                   ← 💰 การขาย
├── Assets/                  ← 🖼️ ไฟล์ Media
└── gpt-researcher/          ← 🔬 Research Tools
```

## 🔗 Essential Files
- กฎโปรเจกต์: [memory.md](memory.md)
- ดัชนีสกิล (Global): [AG_SKILLS_INDEX.md](file:///c:/My%20Claw/MyProjects/ag_skills_backup/AG_SKILLS_INDEX.md)
