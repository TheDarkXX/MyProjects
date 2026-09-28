"""
tt_intel.py — TikTok Trend Intelligence Engine for DoctorBank-Brand
Fetches live data from VPS TikTok API, decodes Engagement DNA, tags Authority Levels (L1-L6),
checks local Topic Dedup Gate, summarizes Posting Heatmap, and outputs structured intelligence.
"""

import sys
import os
import json
import re
import urllib.request
import urllib.parse
from datetime import datetime

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

VPS_API_BASE = os.getenv("VPS_API_BASE", "https://brain.doctorbankonline.com/api/tiktok")
GATEWAY_TOKEN = os.getenv("GATEWAY_TOKEN", "ZIvyWp4BTqcX2Gm1aDHR7lwz0i8PrVqug5KWBX53wqI")

# Resolve Spiderweb Mesh roots for Topic Dedup Gate & Content Catalogs
script_dir = os.path.dirname(os.path.abspath(__file__))
# XBrain root (4 levels up from this script: scripts -> tt -> skills -> .agents -> XBrain)
XBRAIN_ROOT = os.path.abspath(os.path.join(script_dir, "..", "..", "..", ".."))
if not os.path.exists(os.path.join(XBRAIN_ROOT, "package.json")):
    XBRAIN_ROOT = r"C:\XBrain" if os.path.exists(r"C:\XBrain") else r"C:\My Claw\Openclaw-VPS"

# DoctorBank-Brand root
DOCTORBANK_ROOT = os.getenv("DOCTORBANK_ROOT", r"c:\My Claw\DoctorBank-Brand")
if not os.path.exists(DOCTORBANK_ROOT):
    candidate = os.path.abspath(os.path.join(XBRAIN_ROOT, "..", "DoctorBank-Brand"))
    if os.path.exists(candidate):
        DOCTORBANK_ROOT = candidate

DAYS_THAI = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"]

def fetch_api(endpoint, params=None):
    url = f"{VPS_API_BASE}{endpoint}"
    if params:
        query_string = urllib.parse.urlencode(params)
        url += f"?{query_string}"
    
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {GATEWAY_TOKEN}",
            "User-Agent": "Antigravity-TT-Skill/1.0"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data
    except Exception as e:
        sys.stderr.write(f"[API Error] {url}: {e}\n")
    return None

def tag_authority_level(caption, thumbnail_text):
    text = f"{caption or ''} {thumbnail_text or ''}".lower()
    
    # Priority matching L4-L6 first (High Value / Winning Zone)
    # L6: Opportunity / Wealth / Blue Ocean
    if any(k in text for k in ["พลิกวิกฤต", "โอกาสทอง", "ความลับที่ไม่มีใครบอก", "เงินย้าย", "เปลี่ยนชีวิต", "โอกาสใหม่"]):
        return "L6", "ชี้โอกาส (Opportunity)"
        
    # L5: Predict Future / Trends
    if any(k in text for k in ["อนาคต", "แนวโน้ม", "เทรนด์", "1 ปี", "อีกหน่อย", "วิจัยใหม่ล่าสุด", "กำลังจะเปลี่ยน", "ปี 2026", "ปี 2027"]):
        return "L5", "ทำนายอนาคต (Predict Future)"
        
    # L4: Diagnostic / Root Cause (The Winning Zone for DoctorBank)
    l4_signals = [
        "ไม่ใช่เพราะ", "แต่เพราะ", "ต้นตอ", "สาเหตุลึก", "สาเหตุจริง", "ฮอร์โมน", 
        "คอร์ติซอล", "cortisol", "ลำไส้", "gut", "เซลล์", "ระบบประสาท", "ไม่ได้ขาด", 
        "แต่ขาด", "โกรทฮอร์โมน", "growth hormone", "ไทรอยด์", "ไมโตคอนเดรีย", 
        "ดีพสลีป", "deep sleep", "สารสื่อประสาท", "กาบา", "gaba", "เมลาโทนิน", 
        "กรดไหลย้อน", "ไมโครไบโอม", "ภาวะดื้ออินซูลิน", "หลอดเลือด", "สมองส่วน"
    ]
    if any(k in text for k in l4_signals):
        return "L4", "วินิจฉัยต้นตอ (Diagnostic)"
        
    # L3: Myth / False Belief
    l3_signals = ["เข้าใจผิด", "ความเชื่อ", "จริงหรือ", "ไม่จริง", "อย่าเข้าใจผิด", "เชื่อผิด", "หลอกลวง", "ตำนาน"]
    if any(k in text for k in l3_signals):
        return "L3", "สิ่งที่เชื่อผิด (Myth Busted)"
        
    # L2: Mistake / Warning / Pain
    l2_signals = ["อย่าทำ", "หยุดทำ", "ห้าม", "สิ่งที่คนทำผิด", "พังเพราะ", "อันตราย", "เตือนภัย", "ระวัง", "ผิดวิธี", "เสียเงินฟรี", "ทำร้าย"]
    if any(k in text for k in l2_signals):
        return "L2", "สิ่งที่ทำผิด (Mistake)"
        
    # L1: How-to / Tips / Hacks (Commodity AI Content)
    l1_signals = ["วิธี", "เทคนิค", "เคล็ดลับ", "สูตร", "ข้อ", "อันดับ", "ทำตามนี้", "แก้ง่ายๆ", "แชร์วิธี", "ขั้นตอน"]
    if any(k in text for k in l1_signals):
        return "L1", "วิธีแก้ปัญหา (How-to)"
        
    return "L1", "วิธีแก้ปัญหา (General)"

def get_existing_doctorbank_catalog():
    """Builds an index of existing DoctorBank content scripts and XBrain archives with their subtopic keywords."""
    catalog = []
    target_dirs = [
        (DOCTORBANK_ROOT, os.path.join(DOCTORBANK_ROOT, "Quick Save", "Complete", "Content")),
        (DOCTORBANK_ROOT, os.path.join(DOCTORBANK_ROOT, "Content")),
        (XBRAIN_ROOT, os.path.join(XBRAIN_ROOT, "Quick Save", "Complete", "DoctorBank-Band")),
        (XBRAIN_ROOT, os.path.join(XBRAIN_ROOT, "Quick Save", "Complete", "The-Viral")),
        (XBRAIN_ROOT, os.path.join(XBRAIN_ROOT, "Quick Save", "Complete", "Health-Automation"))
    ]
    seen_files = set()
    for base_root, target_dir in target_dirs:
        if not os.path.exists(target_dir):
            continue
        for root, _, files in os.walk(target_dir):
            for file in files:
                if not file.endswith(".md"):
                    continue
                if file.startswith("V2.30.1") or "dashboard" in file.lower() or file in seen_files:
                    continue
                seen_files.add(file)
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_root).replace("\\", "/")
                
                # Extract clean topic title
                title = file.replace(".md", "")
                
                # Extract key keywords from filename
                keywords = []
                clean_name = re.sub(r"^\[.*?\]_?", "", title)
                parts = re.split(r"[_\-]+", clean_name)
                for p in parts:
                    p_clean = p.strip()
                    if len(p_clean) >= 2 and not p_clean.isdigit() and p_clean not in ["wk1", "v1", "devil", "script", "post"]:
                        keywords.append(p_clean.lower())
                
                catalog.append({
                    "file": file,
                    "title": title,
                    "rel_path": rel_path,
                    "keywords": keywords
                })
    return catalog

def check_clip_dedup(caption, thumbnail_text, catalog):
    """Checks if a clip's subject matches any existing script in the catalog."""
    text = f"{caption or ''} {thumbnail_text or ''}".lower()
    
    # Specific known themes in DoctorBank
    theme_rules = [
        (["เยลลี่", "กัมมี่", "gummy"], "[script]_หยุดกินเยลลี่นอนหลับ_gummy-sleep-devil_wk1"),
        (["กลางดึก", "ตื่นตี", "หลับๆ ตื่นๆ", "ตื่นมาฉี่"], "[script]_ตื่นกลางดึกแล้วนอนต่อไม่ได้_middle-insomnia_wk1"),
        (["4 ฟอร์ม", "ฟอร์มแมก", "ไกลซีเนต", "แอล-ทรีโอเนต", "มาเลต"], "[script]_ทำไมต้อง-4-ฟอร์ม_mag-4-forms_wk1"),
        (["ออกไซด์", "oxide", "ท้องเสีย", "ถ่ายเหลว"], "[script]_ระวังแมกนีเซียมผิดฟอร์ม_mag-oxide-devil_wk1"),
        (["ตี 3", "คอร์ติซอล", "cortisol", "เครียด", "สวิตช์"], "[script]_ปิดสวิตช์ความเครียดตี-3_stress-switch_wk1"),
        (["ลำไส้", "จุลินทรีย์", "โพรไบโอติก", "probiotic", "ท้องผูก"], "[script]_โพรไบโอติกกับลำไส้_probiotic-sleep-devil_wk1"),
        (["อาบน้ำสมอง", "ล้างสมอง", "glymphatic", "ขยะสมอง", "อัลไซเมอร์"], "[script]_อาบน้ำให้สมอง_brain-wash_wk1"),
        (["หายใจ", "4-7-8", "4 7 8", "parasympathetic"], "[script]_เทคนิคหายใจ-4-7-8_breathing-478_wk1"),
        (["อ่านฉลาก", "ดูฉลาก", "เลือกอาหารเสริม"], "[script]_วิธีเลือกอาหารเสริม_read-label_wk1"),
        (["เม็ดเหลือง", "cpm", "ยาแก้แพ้", "chlorpheniramine"], "V2.30.0_cpm-yellow-pill-dementia"),
        (["เมลาโทนิน", "melatonin"], "2026-06-17_[script]_magnesium_no-melatonin-formula")
    ]
    
    for kws, script_name in theme_rules:
        if any(k in text for k in kws):
            return f"⚠️ มีแล้ว ({script_name})"
            
    # Generic keyword match against catalog
    for item in catalog:
        match_count = sum(1 for kw in item["keywords"] if kw in text)
        if match_count >= 2:
            return f"⚠️ มีแล้ว ({item['title'][:35]}...)"
            
    return "🟢 Blue Ocean (ยังไม่มีในคลัง)"

def run_intelligence(keyword, date_range="30d", page_size=25):
    # 1. Fetch Clips
    clips_data = fetch_api("/history/clips", {
        "search": keyword,
        "date_range": date_range,
        "page_size": page_size,
        "sort_by": "views",
        "sort_dir": "DESC"
    })
    
    # 2. Fetch Heatmap
    heatmap_data = fetch_api("/analysis/posting-heatmap", {
        "date_range": date_range,
        "min_viral_level": "WARM"
    })
    
    # 3. Catalog for Dedup
    catalog = get_existing_doctorbank_catalog()
    
    clips = []
    level_counts = {"L1": 0, "L2": 0, "L3": 0, "L4": 0, "L5": 0, "L6": 0}
    
    if clips_data and clips_data.get("success"):
        raw_clips = clips_data.get("clips", [])
        for c in raw_clips:
            views = c.get("views") or 0
            likes = c.get("likes") or 0
            shares = c.get("shares") or 0
            comments = c.get("comments") or 0
            hours_old = c.get("hours_old") or 0
            
            # Engagement DNA metrics
            share_rate = round((shares / views * 100), 2) if views > 0 else 0.0
            velocity_per_hour = round(views / max(hours_old, 1)) if hours_old > 0 else (c.get("velocity_score") or 0)
            engagement_rate = round(((likes + shares + comments) / views * 100), 2) if views > 0 else 0.0
            
            # Authority level
            lvl_code, lvl_desc = tag_authority_level(c.get("caption"), c.get("thumbnail_text"))
            level_counts[lvl_code] = level_counts.get(lvl_code, 0) + 1
            
            # Dedup check
            dedup_status = check_clip_dedup(c.get("caption"), c.get("thumbnail_text"), catalog)
            
            # Hook text
            hook = c.get("transcript_hook") or c.get("thumbnail_text") or (c.get("caption")[:60] + "..." if c.get("caption") else "N/A")
            
            clips.append({
                "video_id": c.get("video_id"),
                "author": c.get("author_handle"),
                "views": views,
                "likes": likes,
                "shares": shares,
                "comments": comments,
                "share_rate": share_rate,
                "velocity_per_hour": velocity_per_hour,
                "engagement_rate": engagement_rate,
                "authority_level": lvl_code,
                "authority_desc": lvl_desc,
                "viral_level": c.get("viral_level"),
                "hook": hook.strip().replace("\n", " "),
                "dedup_status": dedup_status,
                "posted_at": c.get("posted_at"),
                "video_url": c.get("video_url")
            })
            
    # Process Heatmap Top Slots
    top_slots = []
    if heatmap_data and heatmap_data.get("success"):
        flat = heatmap_data.get("heatmap", [])
        sorted_slots = sorted(flat, key=lambda x: x.get("count", 0) * x.get("avg_views", 0), reverse=True)
        for s in sorted_slots[:3]:
            day_name = DAYS_THAI[s.get("day", 0)]
            hour = s.get("hour", 0)
            count = s.get("count", 0)
            avg_v = s.get("avg_views", 0)
            top_slots.append({
                "day_name": day_name,
                "hour": hour,
                "time_window": f"{hour:02d}:00 - {hour+1:02d}:00 น.",
                "count": count,
                "avg_views": avg_v
            })
            
    total_found = len(clips)
    total_db_count = clips_data.get("total", 0) if clips_data else 0
    
    # Calculate Market Fluff vs Authority Ratio
    commodity_count = level_counts["L1"] + level_counts["L2"] + level_counts["L3"]
    authority_count = level_counts["L4"] + level_counts["L5"] + level_counts["L6"]
    fluff_ratio = round((commodity_count / total_found * 100), 1) if total_found > 0 else 0
    authority_ratio = round((authority_count / total_found * 100), 1) if total_found > 0 else 0
    
    # Top Champions
    share_champ = max(clips, key=lambda x: x["share_rate"]) if clips else None
    velocity_champ = max(clips, key=lambda x: x["velocity_per_hour"]) if clips else None
    
    return {
        "keyword": keyword,
        "date_range": date_range,
        "total_matches_in_db": total_db_count,
        "analyzed_count": total_found,
        "level_distribution": level_counts,
        "fluff_ratio": fluff_ratio,
        "authority_ratio": authority_ratio,
        "top_slots": top_slots,
        "share_champ": share_champ,
        "velocity_champ": velocity_champ,
        "catalog_size": len(catalog),
        "clips": clips
    }

def format_number(n):
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}k"
    return str(n)

def generate_dynamic_hooks(kw, category="general"):
    """Generates 3 sharp L4 Killer Hooks dynamically tailored to the keyword."""
    kw_clean = kw.strip()
    return [
        {
            "type": "Diagnostic (วินิจฉัยต้นตอจริง)",
            "visual": f"มีอาการนี้ อย่าเพิ่งโทษ {kw_clean}!",
            "spoken": f"มึงไม่ได้เป็นเพราะ {kw_clean} อย่างที่คิดหรอก... แต่ต้นตอจริงคือระบบในเซลล์มึงกำลังขาดตัวส่งสัญญาณต่างหาก!"
        },
        {
            "type": "Paradox / Loss Framing (ทำไมยิ่งแก้ ยิ่งพัง)",
            "visual": f"พยายามดูแลเรื่อง {kw_clean} แต่ทำไมยิ่งพัง?",
            "spoken": f"ทำตามทุกคลิปในเน็ต แต่ทำไมอาการไม่หาย? พลิกดูสิ่งที่มึงกินอยู่ด่วน มึงอาจกำลังเสียเงินซื้อของที่ดูดซึมได้แค่ 4% ฟรีๆ!"
        },
        {
            "type": "Shock & Antagonist (กระชากความเชื่อเก่า)",
            "visual": f"หยุดซื้อ {kw_clean} แบบเดิมด่วน!",
            "spoken": f"ถ้ามึงยังเลือก {kw_clean} จากราคาถูกที่สุด มึงกำลังเอาสารตกค้างเข้าไปสะสมในตับไตโดยไม่รู้ตัว ฟังคลิปนี้ให้จบก่อนจะสายไป!"
        }
    ]

def render_markdown_report(data):
    kw = data["keyword"]
    dr = data["date_range"]
    total = data["total_matches_in_db"]
    analyzed = data["analyzed_count"]
    fluff = data["fluff_ratio"]
    auth = data["authority_ratio"]
    dist = data["level_distribution"]
    
    # Calculate Strategic Verdict
    if total == 0:
        verdict = "🔴 RED LIGHT — ข้ามไปก่อน (ตลาดเงียบกริบ ไม่มีคลิปไวรัลใน 30 วัน)"
        verdict_desc = "ยังไม่มี Volume การค้นหาหรือไวรัลที่คุ้มค่าแก่การลงทุนทำคอนเทนต์ในตอนนี้"
    elif fluff >= 65:
        verdict = "🟢 GREEN LIGHT — ลุยแทงทะลวงได้ทันที (Blue Ocean for L4 Authority)"
        verdict_desc = f"ตลาดกำลังเอียนคอนเทนต์ขยะ L1-L3 สูงถึง {fluff}% คนดูต้องการ 'หมอตัวจริง' ที่มาชี้ต้นตอ Diagnostic!"
    else:
        verdict = "🟡 YELLOW LIGHT — ต้องบิดมุม (Twist Angle) ห้ามชนตรง"
        verdict_desc = "มีคอนเทนต์คุณภาพและคู่แข่งเริ่มเจาะลึกแล้ว ต้องใช้มุม Paradox หรือกระชากหน้ากากวงการเพื่อฉีกตัวออก"
        
    lines = []
    lines.append(f"## 📊 TikTok Trend Intelligence Report: `{kw}` ({dr})")
    lines.append(f"> **พิกัดสดจาก VPS API:** พบทั้งหมด **{total}** คลิป (วิเคราะห์ละเอียด Top {analyzed} คลิป) | **ระดับความโหล (L1-L3):** `{fluff}%` | **Authority แท้ (L4-L6):** `{auth}%`\n")
    
    # DNA Champions Banner
    sc = data.get("share_champ")
    vc = data.get("velocity_champ")
    lines.append("### 🧬 Engagement DNA Champions")
    if sc:
        lines.append(f"- 🔥 **Share Rate สูงสุด (Viral Shareability):** `{sc['share_rate']}%` — *\"{sc['hook']}\"* โดย `@{sc['author']}` (วิว {format_number(sc['views'])})")
    if vc:
        lines.append(f"- ⚡ **Velocity สูงสุด (ความเร็วการพุ่ง):** `{format_number(vc['velocity_per_hour'])} วิว/ชม.` — *\"{vc['hook']}\"* โดย `@{vc['author']}`")
    lines.append("")
    
    # Table of Clips
    lines.append("### 📋 ตารางจัดอันดับคลิปไวรัล (Viral Performance & Authority Matrix)")
    lines.append("| # | คลิป / Visual Hook | ช่อง (@Creator) | ยอดวิว | Share % | Speed (v/h) | Authority Level | สถานะคลัง DoctorBank | ลิงก์ |")
    lines.append("|---|-------------------|----------------|--------|---------|-------------|-----------------|---------------------|------|")
    
    for idx, c in enumerate(data.get("clips", []), 1):
        clean_hook = c['hook'].replace("|", "/")
        if len(clean_hook) > 40:
            clean_hook = clean_hook[:37] + "..."
        lvl = c['authority_level']
        lvl_badge = f"`[{lvl}]`"
        if lvl in ["L4", "L5", "L6"]:
            lvl_badge = f"⭐ **`[{lvl}]`**"
        
        v_str = format_number(c['views'])
        s_rate = f"{c['share_rate']}%"
        speed_str = format_number(c['velocity_per_hour'])
        dedup = c['dedup_status']
        v_url = f"[ดูคลิป]({c['video_url']})" if c['video_url'] else "-"
        
        lines.append(f"| {idx} | {clean_hook} | `@{c['author']}` | {v_str} | {s_rate} | {speed_str} | {lvl_badge} | {dedup} | {v_url} |")
        
    lines.append("")
    
    # Posting Heatmap Section
    lines.append("### 🕐 TikTok Posting Heatmap Insights (ช่วงเวลาทองคำคลิปสุขภาพ)")
    top_slots = data.get("top_slots", [])
    if top_slots:
        for idx, slot in enumerate(top_slots, 1):
            lines.append(f"{idx}. ⏰ **วัน{slot['day_name']} ช่วง {slot['time_window']}** — ยอดวิวเฉลี่ยคลิปปังสูงถึง **{format_number(slot['avg_views'])} วิว** (ตัวอย่างไวรัล {slot['count']} คลิป)")
    else:
        lines.append("- ยังไม่มีข้อมูล Heatmap สำหรับช่วงเวลานี้")
    lines.append("")
    
    # War Brief Section
    lines.append("---")
    lines.append("## ⚔️ มารบูรพา Executive War Brief: สรุปยุทธศาสตร์รบฉบับเอาไปใช้ได้จริง")
    lines.append("")
    lines.append(f"### 🚦 1. Strategic Verdict (การตัดสินใจทางยุทธศาสตร์)")
    lines.append(f"**สถานะ:** {verdict}")
    lines.append(f"> **คำวินิจฉัย:** {verdict_desc}")
    lines.append("")
    lines.append(f"### 🪤 2. The Fatigue Trap (หลุมพรางที่ห้ามทำเด็ดขาด)")
    lines.append(f"- **มุมที่คนดูเอียนจนเลิกดู:** ห้ามทำคอนเทนต์ประเภท 'ประโยชน์ของ {kw}' หรือ '3 วิธีแก้ {kw}' ลอยๆ เด็ดขาด เพราะในฟีดมีไปแล้วถึง **{fluff}%** (L1: {dist['L1']} คลิป, L2: {dist['L2']} คลิป) คนปัดผ่านทันทีตั้งแต่ 2 วินาทีแรก")
    lines.append(f"- **จุดบอดคู่แข่ง (Competitor Blindspot):** ช่องส่วนใหญ่ทำได้แค่ 'บอกอาการ' หรือ 'อ่านฉลาก' แต่ไม่มีใครกล้า 'ผ่าพิสูจน์กลไกชีววิทยา' ให้คนดูตาสว่าง")
    lines.append("")
    lines.append(f"### 🎯 3. The L4 Breakthrough (มุมแทงทะลวงสร้าง Authority)")
    lines.append(f"- **น่านน้ำว่าง L4:** มีคลิปแนว Diagnostic ต้นตอจริงเพียง **{dist['L4']} คลิป ({auth}%)**")
    lines.append(f"- **จุดกระตุ้นต่อมแชร์ (Shareability Catalyst):** สังเกตจากคลิปที่ได้ Share Rate สูงสุด คนจะยอมกดแชร์ก็ต่อเมื่อคลิปนั้น **'บอกสิ่งที่เขาเข้าใจผิดมาทั้งชีวิต'** หรือ **'ช่วยให้เขาไม่เสียโง่/เสียเงินฟรี'**")
    lines.append("")
    
    # Dynamic Hooks
    hooks = generate_dynamic_hooks(kw)
    lines.append("### 💥 4. 3 Ready-to-Shoot Hooks (หมัดเด็ดเลือกไปอัดคลิปได้ทันที)")
    for i, h in enumerate(hooks, 1):
        lines.append(f"{i}. **{h['type']}:**")
        lines.append(f"   - **Visual Hook (หน้าปก/ตัวหนังสือบนจอ):** `\"{h['visual']}\"` ({len(h['visual'])} ตัวอักษร)")
        lines.append(f"   - **Spoken Hook (คำพูดเปิดคลิป 0-3 วิ):** `\"{h['spoken']}\"`")
    lines.append("")
    
    # Best Timing
    if top_slots:
        best_slot = top_slots[0]
        lines.append(f"### ⏰ 5. Launch Timing (จังหวะปล่อยของที่ดีที่สุด)")
        lines.append(f"- แนะนำตั้งเวลาปล่อยคลิป: **วัน{best_slot['day_name']} ช่วง {best_slot['time_window']}** (สถิติยืนยันยอดวิวเฉลี่ยสูงสุด {format_number(best_slot['avg_views'])} วิว)")
        lines.append("")
        
    lines.append("### 🚀 Next-Step Commands (เชื่อมต่อขุมพลัง XBrain & DoctorBank)")
    lines.append(f"- 🎙️ **แกะซับ/ถอดสคริปต์คลิปไวรัลตัวท็อป:** พิมพ์ `/tsc [URL ลิงก์คลิปด้านบน]` (ใช้ Supadata แกะคำพูด 0-3 วิแรกแบบละเอียด)")
    lines.append(f"- 🔬 **ขุดงานวิจัย/เปเปอร์การแพทย์หนุนมุม L4:** พิมพ์ `/gcons {kw}` หรือ `/gdeep 5 {kw}` (ค้น PubMed & Europe PMC ฟรี 100% ไม่เสียโควตา)")
    lines.append(f"- ✍️ **สับสคริปต์ DoctorBank สายดาร์ก:** สลับไป workspace `DoctorBank-Brand` แล้วพิมพ์ `/devilscript {kw}`")
    lines.append(f"- 🎬 **วางโครงสร้างสคริปต์ร่วมกันทีละท่อน:** พิมพ์ `/viralscript {kw}`")
    lines.append(f"- 🔍 **ส่องเทรนด์คีย์เวิร์ดถัดไป:** พิมพ์ `/tt [keyword ใหม่]`")
    lines.append(f"- 💾 **บันทึกรายงาน Intelligence เข้าระบบ:** พิมพ์ `/save`")
    
    return "\n".join(lines)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tt_intel.py <keyword> [date_range] [--json]")
        sys.exit(1)
        
    kw = sys.argv[1]
    dr = "30d"
    output_json = False
    
    for arg in sys.argv[2:]:
        if arg == "--json":
            output_json = True
        elif not arg.startswith("--"):
            dr = arg
            
    res = run_intelligence(kw, dr)
    
    if output_json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(render_markdown_report(res))
