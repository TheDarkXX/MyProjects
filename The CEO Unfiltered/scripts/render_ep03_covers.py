#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render_ep03_covers.py
======================
Master Pattern Interrupt Feed Cover Generator for The CEO Unfiltered EP.03
(Law of Attraction, Infinite Intelligence, & Intellectual Delusion)
Powered by Playwright Headless Chrome for 100% typographic perfection.
"""
import os
import sys
import base64
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_KANIT_EXTRABOLD = os.path.join(PROJECT_DIR, "fonts", "Kanit-ExtraBold.ttf").replace("\\", "/")
FONT_KANIT_BOLD = os.path.join(PROJECT_DIR, "fonts", "Kanit-Bold.ttf").replace("\\", "/")
FONT_KANIT_SEMI = os.path.join(PROJECT_DIR, "fonts", "Kanit-SemiBold.ttf").replace("\\", "/")
FONT_KANIT_MED = os.path.join(PROJECT_DIR, "fonts", "Kanit-Medium.ttf").replace("\\", "/")


def render_kanit_cover(
    bg_image_path: str,
    output_path: str,
    line1: str,
    line2: str,
    sub_text: str = "รู้ทฤษฎี 80% vs ลงมือฟันดาบ 20% • ตาสว่างหลังเที่ยงคืน",
    episode_tag: str = "EP.03",
    line1_color: str = "#FFFFFF",  # Pure White or Neon Yellow (#FFF200)
    headline_top: int = 105,
    red_box_pad_bottom: int = 30,
    red_box_font_size: int = 68,
    line1_font_size: int = 70,
    width: int = 1080,
    height: int = 1080,
):
    if not os.path.exists(bg_image_path):
        raise FileNotFoundError(f"Background image not found: {bg_image_path}")

    with open(bg_image_path, "rb") as f:
        b64_bg = base64.b64encode(f.read()).decode("utf-8")

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@font-face {{
    font-family: 'KanitCustom';
    src: url('file:///{FONT_KANIT_EXTRABOLD}') format('truetype');
    font-weight: 800;
}}
@font-face {{
    font-family: 'KanitCustom';
    src: url('file:///{FONT_KANIT_BOLD}') format('truetype');
    font-weight: 700;
}}
@font-face {{
    font-family: 'KanitCustom';
    src: url('file:///{FONT_KANIT_SEMI}') format('truetype');
    font-weight: 600;
}}
@font-face {{
    font-family: 'KanitCustom';
    src: url('file:///{FONT_KANIT_MED}') format('truetype');
    font-weight: 500;
}}
* {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    user-select: none;
}}
body {{
    width: {width}px;
    height: {height}px;
    position: relative;
    background: #000;
    font-family: 'KanitCustom', -apple-system, sans-serif;
    overflow: hidden;
}}
.bg {{
    position: absolute;
    top: 0;
    left: 0;
    width: {width}px;
    height: {height}px;
    object-fit: cover;
}}
.vignette {{
    position: absolute;
    top: 0;
    left: 0;
    width: {width}px;
    height: 520px;
    background: linear-gradient(180deg, rgba(6,9,15,0.96) 0%, rgba(6,9,15,0.88) 45%, rgba(6,9,15,0.45) 80%, rgba(6,9,15,0) 100%);
}}
.top-bar {{
    position: absolute;
    top: 40px;
    left: 50px;
    right: 50px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
}}
.left-badges {{
    display: flex;
    gap: 12px;
    align-items: center;
}}
.badge-brand {{
    background: #0B0F19;
    border: 2px solid #38BDF8;
    color: #38BDF8;
    font-size: 22px;
    font-weight: 700;
    padding: 6px 18px;
    border-radius: 12px;
    letter-spacing: 0.5px;
}}
.badge-ep {{
    background: #1E293B;
    border: 2px solid #64748B;
    color: #F8FAFC;
    font-size: 22px;
    font-weight: 700;
    padding: 6px 16px;
    border-radius: 12px;
}}
.badge-threat {{
    background: #450A0A;
    border: 2px solid #EF4444;
    color: #FCA5A5;
    font-size: 22px;
    font-weight: 700;
    padding: 6px 16px;
    border-radius: 12px;
}}
.headline-container {{
    position: absolute;
    top: {headline_top}px;
    left: 0;
    width: {width}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 10;
}}
.line1 {{
    font-size: {line1_font_size}px;
    font-weight: 700; /* Kanit Bold */
    color: {line1_color};
    paint-order: stroke fill;
    -webkit-text-stroke: 10px #000000;
    text-shadow: 0 8px 18px rgba(0,0,0,0.95);
    letter-spacing: -0.5px;
    line-height: 1.25;
    margin-bottom: 8px;
    text-align: center;
}}
.red-box {{
    background: #E50000;
    border-radius: 24px;
    padding: 16px 44px {red_box_pad_bottom}px 44px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
}}
.line2 {{
    font-size: {red_box_font_size}px;
    font-weight: 800; /* Kanit ExtraBold */
    color: #FFFFFF;
    text-shadow: 0 3px 6px rgba(127,29,29,0.9);
    letter-spacing: -0.5px;
    line-height: 1.15;
    text-align: center;
    white-space: nowrap;
}}
.sub-pill {{
    background: rgba(11, 15, 25, 0.95);
    border: 2px solid #F59E0B;
    border-radius: 14px;
    padding: 7px 24px 9px 24px;
    color: #FBBF24;
    font-size: 26px;
    font-weight: 500; /* Kanit Medium */
    box-shadow: 0 4px 12px rgba(0,0,0,0.7);
    letter-spacing: 0.2px;
}}
.footer {{
    position: absolute;
    bottom: 30px;
    right: 50px;
    color: #CBD5E1;
    font-size: 18px;
    font-weight: 600;
    z-index: 10;
    text-shadow: 0 2px 6px rgba(0,0,0,0.9);
}}
</style>
</head>
<body>
    <img class="bg" src="data:image/jpeg;base64,{b64_bg}">
    <div class="vignette"></div>
    <div class="top-bar">
        <div class="left-badges">
            <div class="badge-brand">THE CEO UNFILTERED</div>
            {f'<div class="badge-ep">{episode_tag}</div>' if episode_tag else ''}
        </div>
        <div class="badge-threat">AI ตบกะโหลก!</div>
    </div>
    <div class="headline-container">
        <div class="line1">{line1}</div>
        <div class="red-box">
            <div class="line2">{line2}</div>
        </div>
        <div class="sub-pill">{sub_text}</div>
    </div>
    <div class="footer">The CEO Unfiltered • บันทึกดิบหลังโต๊ะทำงาน</div>
</body>
</html>"""

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": width, "height": height})
        page.set_content(html_content)
        page.wait_for_timeout(250)
        page.screenshot(path=output_path, quality=98, type="jpeg")
        browser.close()

    print(f"[OK] EP.03 Cover Rendered: {output_path}")
    return output_path


def main():
    base_assets = os.path.join(PROJECT_DIR, "assets")
    bg_raw = os.path.join(base_assets, "EP03_loa_universe_vortex_raw.jpg")

    print("[*] Generating Master Pattern Interrupt Covers for EP.03...")

    # Variant 1: The Master Punch (Style B Pure White Line 1)
    render_kanit_cover(
        bg_image_path=bg_raw,
        output_path=os.path.join(base_assets, "EP03_loa_v1_master_punch.jpg"),
        line1="อ่านกฎแรงดึงดูดมาทั้งชีวิต...",
        line2="ทำไมมึงยังไม่รวยสักทีวะ?!",
        sub_text="รู้ทฤษฎี 80% vs ลงมือฟันดาบ 20% • ตาสว่างหลังเที่ยงคืน",
        line1_color="#FFFFFF",
        headline_top=105,
        red_box_pad_bottom=30,
        red_box_font_size=68,
        line1_font_size=70,
    )

    # Variant 2: The Identity Truth (Neon Yellow Line 1)
    render_kanit_cover(
        bg_image_path=bg_raw,
        output_path=os.path.join(base_assets, "EP03_loa_v2_identity_truth.jpg"),
        line1="มึงไม่ได้ดึงดูดสิ่งที่มึงอยากได้...",
        line2="แต่มึงดึงดูดสิ่งที่มึงเป็น!",
        sub_text="เลิกนั่งขอพรจักรวาล • สร้างตัวตนผู้ผลิต (Producer)",
        line1_color="#FFF200",
        headline_top=105,
        red_box_pad_bottom=30,
        red_box_font_size=70,
        line1_font_size=66,
    )

    # Variant 3: Toxic Positivity Roast (Pure White Line 1)
    render_kanit_cover(
        bg_image_path=bg_raw,
        output_path=os.path.join(base_assets, "EP03_loa_v3_toxic_positivity.jpg"),
        line1="คิดบวก แปะรูป นั่งมโน...",
        line2="ยาเสพติดของคนขี้เกียจ!",
        sub_text="จักรวาลไม่ใช่ยักษ์ในตะเกียงแก้ว • ตื่นมาดูฟิสิกส์โลกจริง",
        line1_color="#FFFFFF",
        headline_top=105,
        red_box_pad_bottom=30,
        red_box_font_size=70,
        line1_font_size=70,
    )

    # Variant 4: Action Over Woo-woo (Pure White Line 1)
    render_kanit_cover(
        bg_image_path=bg_raw,
        output_path=os.path.join(base_assets, "EP03_loa_v4_action_over_woowoo.jpg"),
        line1="กฎแรงดึงดูดมีจริง...",
        line2="แต่จักรวาลให้รางวัลคนลงมือทำ!",
        sub_text="ระบบประสาท RAS • Infinite Intelligence ในโลกความจริง",
        line1_color="#FFFFFF",
        headline_top=105,
        red_box_pad_bottom=30,
        red_box_font_size=62,
        line1_font_size=72,
    )

    # Master Final Cover
    master_final = os.path.join(base_assets, "EP03_cover_master_final.jpg")
    render_kanit_cover(
        bg_image_path=bg_raw,
        output_path=master_final,
        line1="อ่านกฎแรงดึงดูดมาทั้งชีวิต...",
        line2="ทำไมมึงยังไม่รวยสักทีวะ?!",
        sub_text="รู้ทฤษฎี 80% vs ลงมือฟันดาบ 20% • ตาสว่างหลังเที่ยงคืน",
        line1_color="#FFFFFF",
        headline_top=105,
        red_box_pad_bottom=30,
        red_box_font_size=68,
        line1_font_size=70,
    )

    print("\n[SUCCESS] All 4 EP.03 Pattern Interrupt Covers + Master Final Rendered!")


if __name__ == "__main__":
    main()
