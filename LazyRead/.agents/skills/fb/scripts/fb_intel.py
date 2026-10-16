"""
fb_intel.py — Facebook Trend Intelligence Engine for DoctorBank-Brand
Fetches live data from VPS Facebook Posts API, decodes Engagement DNA,
tags Authority Levels (L1-L6), summarizes Best Posting Time Heatmap,
and outputs structured intelligence for Slash Command /fb.
"""

import sys
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

VPS_API_BASE = os.getenv("VPS_API_BASE", "https://brain.doctorbankonline.com/api/fb/posts")
API_KEY = os.getenv("BRAIN_API_KEY", "doctorbank2026")

DAYS_THAI = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"]

def fetch_api(endpoint, params=None):
    url = f"{VPS_API_BASE}{endpoint}"
    if params:
        query_string = urllib.parse.urlencode(params)
        url += f"?{query_string}"
    
    req = urllib.request.Request(
        url,
        headers={
            "x-api-key": API_KEY,
            "User-Agent": "Antigravity-FB-Skill/1.0"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data
    except Exception as e:
        sys.stderr.write(f"[API Error] {url}: {e}\n")
    return None

def main():
    keyword = sys.argv[1] if len(sys.argv) > 1 else ""
    date_range = sys.argv[2] if len(sys.argv) > 2 else "30d"

    print(f"\n🔍 [Facebook Trend Intelligence] กำลังสแกนข้อมูลสด: Keyword='{keyword or 'ALL'}', Range='{date_range}'...")

    # 1. Fetch Posts Feed
    trends_res = fetch_api("/trends", {
        "q": keyword,
        "date_range": date_range,
        "sort": "share_rate",
        "order": "desc",
        "limit": 30
    })

    # 2. Fetch Analysis KPIs & Authority Breakdown
    analysis_res = fetch_api("/analysis", {
        "date_range": date_range
    })

    # 3. Fetch Heatmap
    heatmap_res = fetch_api("/heatmap")

    if not trends_res or not trends_res.get("success"):
        print("❌ ไม่สามารถดึงข้อมูลจาก VPS API ได้ หรือยังไม่มีข้อมูลโพสต์ในระบบ")
        return

    posts = trends_res.get("posts", [])
    total_found = trends_res.get("total", len(posts))
    kpis = analysis_res.get("kpis", {}) if analysis_res else {}
    auth_breakdown = analysis_res.get("authorityBreakdown", []) if analysis_res else []

    print("\n" + "="*80)
    print("📊 1. OVERALL TELEMETRY (สถิติรวมในระบบ)")
    print("="*80)
    print(f"• โพสต์ทั้งหมดในระบบ: {kpis.get('totalPosts', 0):,} โพสต์ | จำนวนเพจที่ติดตาม: {kpis.get('totalPages', 0):,} เพจ")
    print(f"• ยอด Reactions รวม: {kpis.get('totalReactions', 0):,} | ยอดแชร์รวม: {kpis.get('totalShares', 0):,} ครั้ง")
    print(f"• Share Rate เฉลี่ย: {kpis.get('avgShareRate', 0)}% | โพสต์ระดับไวรัลทองคำ (Share Rate ≥ 20%): {kpis.get('viralPostsCount', 0):,} โพสต์")

    print("\n" + "="*80)
    print(f"🔥 2. TOP SHARE RATE CHAMPIONS ({len(posts)} โพสต์ที่ค้นพบ)")
    print("="*80)
    print(f"{'#':<3} | {'Auth':<4} | {'Share%':<7} | {'Shares':<7} | {'Likes':<7} | {'Page':<18} | {'Hook / Headline'}")
    print("-" * 80)

    for i, p in enumerate(posts[:10], 1):
        auth = p.get("authority_level", "L1")
        s_rate = f"{p.get('share_rate', 0)}%"
        s_cnt = f"{p.get('share_count', 0):,}"
        r_cnt = f"{p.get('reaction_count', 0):,}"
        page = (p.get("author") or p.get("page_name") or "Unknown")[:16]
        hook = (p.get("hook_text") or p.get("text") or "").replace("\n", " ")[:36]
        print(f"{i:<3} | {auth:<4} | {s_rate:<7} | {s_cnt:<7} | {r_cnt:<7} | {page:<18} | {hook}...")

    print("\n" + "="*80)
    print("🧬 3. DOCTORBANK AUTHORITY SPECTRUM (สเปกตรัมความน่าเชื่อถือ L1 - L6)")
    print("="*80)
    for a in auth_breakdown:
        lvl = a.get("authority_level", "")
        lbl = a.get("authority_label", "")
        cnt = a.get("count", 0)
        avg_s = a.get("avg_share_rate", 0)
        marker = "⭐ " if lvl == "L4" else "   "
        print(f"{marker}[{lvl}] {lbl:<32}: {cnt:>4} โพสต์ (Avg Share Rate: {avg_s}%)")

    # Heatmap summary
    if heatmap_res and heatmap_res.get("matrix"):
        matrix = heatmap_res.get("matrix")
        top_slots = []
        for d_idx, day_row in enumerate(matrix):
            for h_idx, cell in enumerate(day_row):
                if cell.get("count", 0) > 0:
                    top_slots.append((cell.get("count", 0), cell.get("avgShareRate", 0), d_idx, h_idx))
        
        top_slots.sort(key=lambda x: (x[0], x[1]), reverse=True)
        print("\n" + "="*80)
        print("⏰ 4. FACEBOOK POSTING HEATMAP (เวลาทองคำที่โพสต์หนาแน่น & แชร์สูงสุด)")
        print("="*80)
        if top_slots:
            for rank, (cnt, s_rate, d_idx, h_idx) in enumerate(top_slots[:4], 1):
                day_name = DAYS_THAI[d_idx]
                print(f"  {rank}. วัน{day_name} เวลา {h_idx:02d}:00น. — โพสต์ {cnt} ครั้ง (Avg Share Rate: {s_rate}%)")
        else:
            print("  (ยังไม่มีข้อมูล Timestamp สมบูรณ์พอสำหรับการทำ Heatmap)")

    print("\n" + "="*80)
    print("⚔️ 5. มารบูรพา WAR BRIEF & BLUEPRINT ACTION")
    print("="*80)
    print("• ตลาด Facebook ขับเคลื่อนด้วย 'การแชร์เพื่อเก็บไว้อ่าน' และ 'การแท็กเพื่อนเพื่อเตือนภัย'")
    print("• โพสต์ที่ได้ Share Rate เกิน 20% มักเป็นสไตล์ [⭐ L4 Diagnostic]: ชี้ต้นตอลึกที่หมอทั่วไปไม่ได้บอก")
    print("• พาดหัวต้องกระตุกนิ้วใน 2 บรรทัดแรกก่อนปุ่ม 'See more' ตัดคำ")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
