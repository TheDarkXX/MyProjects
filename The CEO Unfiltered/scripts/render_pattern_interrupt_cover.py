#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render_pattern_interrupt_cover.py
=================================
Master Pattern Interrupt Feed Cover Generator for The CEO Unfiltered
Powered by Playwright Headless Chrome for 100% typographic perfection:
- Font: Kanit-SemiBold (Weight 600) with zero vowel/tone mark overlapping
- Red Box: #E50000 with +3 levels generous bottom breathing room padding
- Line 1: paint-order: stroke fill for crisp 10px black outer stroke
- Background: Cognitive Dissonance burning books (EP01_interrupt_books_fire_raw.jpg)
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
FONT_KANIT_SEMI = os.path.join(PROJECT_DIR, "fonts", "Kanit-SemiBold.ttf").replace("\\", "/")
FONT_KANIT_BOLD = os.path.join(PROJECT_DIR, "fonts", "Kanit-Bold.ttf").replace("\\", "/")
FONT_KANIT_MED = os.path.join(PROJECT_DIR, "fonts", "Kanit-Medium.ttf").replace("\\", "/")


def render_kanit_cover(
    bg_image_path: str,
    output_path: str,
    line1: str,
    line2: str,
    sub_text: str = "80% นิทานหลอกแดก vs 20% ฟิสิกส์โลกความจริง",
    episode_tag: str = "EP.01",
    line1_color: str = "#FFF200",  # Neon Yellow (#FFF200) or White (#FFFFFF)
    headline_top: int = 110,
    red_box_pad_bottom: int = 30,  # +3 levels extra bottom padding
    red_box_font_size: int = 74,
    line1_font_size: int = 72,
):
    if not os.path.exists(bg_image_path):
        raise FileNotFoundError(f"Background image not found: {bg_image_path}")

    # Read background image into base64 to ensure instant Chrome rendering
    with open(bg_image_path, "rb") as f:
        b64_bg = base64.b64encode(f.read()).decode("utf-8")

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@font-face {{
    font-family: 'KanitCustom';
    src: url('file:///{FONT_KANIT_SEMI}') format('truetype');
    font-weight: 600;
}}
@font-face {{
    font-family: 'KanitCustom';
    src: url('file:///{FONT_KANIT_BOLD}') format('truetype');
    font-weight: 700;
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
    width: 1080px;
    height: 1080px;
    position: relative;
    background: #000;
    font-family: 'KanitCustom', -apple-system, sans-serif;
    overflow: hidden;
}}
.bg {{
    position: absolute;
    top: 0;
    left: 0;
    width: 1080px;
    height: 1080px;
    object-fit: cover;
}}
.vignette {{
    position: absolute;
    top: 0;
    left: 0;
    width: 1080px;
    height: 520px;
    background: linear-gradient(180deg, rgba(6,9,15,0.96) 0%, rgba(6,9,15,0.88) 45%, rgba(6,9,15,0.45) 80%, rgba(6,9,15,0) 100%);
}}
.top-bar {{
    position: absolute;
    top: 42px;
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
    width: 1080px;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 10;
}}
.line1 {{
    font-size: {line1_font_size}px;
    font-weight: 600;
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
    padding: 16px 48px {red_box_pad_bottom}px 48px; /* Extra bottom breathing room */
    box-shadow: 0 10px 24px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
}}
.line2 {{
    font-size: {red_box_font_size}px;
    font-weight: 600;
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
    font-size: 28px;
    font-weight: 600;
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
            <div class="badge-ep">{episode_tag}</div>
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
        page = browser.new_page(viewport={"width": 1080, "height": 1080})
        page.set_content(html_content)
        page.wait_for_timeout(250)
        page.screenshot(path=output_path, quality=98, type="jpeg")
        browser.close()

    print(f"[OK] Master Cover Rendered: {output_path}")
    return output_path


def main():
    base_assets = os.path.join(PROJECT_DIR, "assets")
    books_fire_raw = os.path.join(base_assets, "EP01_interrupt_books_fire_raw.jpg")

    print("[*] Generating Master Kanit-SemiBold Covers on Burning Books...")

    # Variant 1: Sarcastic Slogan (Neon Yellow)
    render_kanit_cover(
        bg_image_path=books_fire_raw,
        output_path=os.path.join(base_assets, "EP01_master_kanit_v1_sarcastic.jpg"),
        line1="ตื่นตี 5 ตามหนังสือ...",
        line2="ชีวิตมึงรวยขึ้นกี่โมง?!",
        sub_text="80% นิทานหลอกแดก vs 20% ฟิสิกส์โลกความจริง",
        line1_color="#FFF200",  # Neon Yellow
        headline_top=110,
        red_box_pad_bottom=30,
        red_box_font_size=74,
    )

    # Variant 2: Style B (Pure White Line 1 - The exact favorite of user)
    render_kanit_cover(
        bg_image_path=books_fire_raw,
        output_path=os.path.join(base_assets, "EP01_master_kanit_v2_styleB_truth.jpg"),
        line1="หนังสือพัฒนาตัวเอง...",
        line2="เรื่องจริง หรือ หลอกเด็ก?!",
        sub_text="80% นิทานหลอกแดก vs 20% ฟิสิกส์โลกความจริง",
        line1_color="#FFFFFF",  # Pure White (Style B DNA)
        headline_top=110,
        red_box_pad_bottom=30,
        red_box_font_size=72,
    )

    # Variant 3: 100 Books Reality Check (Neon Yellow)
    render_kanit_cover(
        bg_image_path=books_fire_raw,
        output_path=os.path.join(base_assets, "EP01_master_kanit_v3_poor_roast.jpg"),
        line1="อ่านจบเป็น 100 เล่ม...",
        line2="ทำไมมึงยังจนเหมือนเดิม?!",
        sub_text="เลิกเป็นเหยื่อผู้เสพ • เริ่มสร้างระบบทำงานแทน",
        line1_color="#FFF200",  # Neon Yellow
        headline_top=110,
        red_box_pad_bottom=30,
        red_box_font_size=72,
    )

    # Variant 4: Vegetable Vendor Leverage Quote (Pure White Line 1)
    render_kanit_cover(
        bg_image_path=books_fire_raw,
        output_path=os.path.join(base_assets, "EP01_master_kanit_v4_leverage_quote.jpg"),
        line1="ถ้าตื่นตี 5 แล้วรวย...",
        line2="คนส่งผักคงเป็นมหาเศรษฐี!",
        sub_text="ทุนนิยมจ่ายให้คานผ่อนแรง ไม่ได้จ่ายให้คนตื่นเช้า!",
        line1_color="#FFFFFF",  # Pure White
        headline_top=110,
        red_box_pad_bottom=30,
        red_box_font_size=68,
    )

    print("\n[SUCCESS] All 4 Master Kanit-SemiBold Covers Rendered Successfully!")


if __name__ == "__main__":
    main()
