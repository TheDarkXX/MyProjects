#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render_pattern_interrupt_cover.py
=================================
Renders world-class, high-converting Pattern Interrupt feed covers for The CEO Unfiltered
using authentic DoctorBank /cover typography DNA (Prompt-Black, Red Rounded Box #E50000)
and the neuroscience principles of Viral_Pattern_Interrupt_Master_Playbook.md.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ─── Typography Setup ───────────────────────────────────────────────────────
FONT_BLACK = "C:/XBrain/tools/tiktok-poster/data/fonts/Prompt-Black.ttf"
FONT_BOLD = "C:/XBrain/tools/tiktok-poster/data/fonts/Prompt-Bold.otf"
FONT_SEMI = "C:/XBrain/tools/tiktok-poster/data/fonts/Prompt-SemiBold.otf"
FONT_THAI_UI = "C:/Windows/Fonts/LeelaUIb.ttf"


def render_pattern_cover(
    bg_image_path: str,
    output_path: str,
    line1: str,
    line2: str,
    sub_text: str = "80% นิทานหลอกแดก vs 20% ฟิสิกส์โลกความจริง",
    episode_tag: str = "EP.01",
    line1_color: str = "#FFF200",  # Neon Yellow
    headline_top: int = 120,
    dark_vignette_height: float = 0.52,
    dark_alpha: int = 230,
):
    if not os.path.exists(bg_image_path):
        raise FileNotFoundError(f"Background image not found: {bg_image_path}")

    img = Image.open(bg_image_path).convert("RGB")
    width, height = img.size

    # 1. Subtle Dark Vignette at the top for surgical typography contrast
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    fade_px = int(height * dark_vignette_height)
    for y in range(fade_px):
        # Smooth quadratic ease-out fade
        alpha = int(dark_alpha * (1 - (y / fade_px) ** 1.3))
        overlay_draw.line([(0, y), (width, y)], fill=(6, 9, 15, alpha))

    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # 2. Font Instances (Using Thai-compatible fonts for 100% clean rendering)
    font_badge = ImageFont.truetype(FONT_BOLD, 22)
    font_badge_threat = ImageFont.truetype(FONT_BOLD, 22)
    font_l1 = ImageFont.truetype(FONT_BLACK, 70)
    font_l2 = ImageFont.truetype(FONT_BLACK, 72)
    font_sub = ImageFont.truetype(FONT_BOLD, 30)
    font_foot = ImageFont.truetype(FONT_SEMI, 18)

    # 3. Top Badges: [THE CEO UNFILTERED] [EP.XX]
    badge_y = 45

    # Brand Badge (Cyan / Electric Blue Accent)
    brand_text = "THE CEO UNFILTERED"
    b_bbox = draw.textbbox((0, 0), brand_text, font=font_badge)
    b_w = b_bbox[2] - b_bbox[0]
    draw.rounded_rectangle([50, badge_y, 50 + b_w + 36, badge_y + 46], radius=12, fill="#0B0F19", outline="#38BDF8", width=2)
    draw.text((68, badge_y + 7), brand_text, font=font_badge, fill="#38BDF8")

    # Episode Pill
    ep_x = 50 + b_w + 48
    ep_bbox = draw.textbbox((0, 0), episode_tag, font=font_badge)
    ep_w = ep_bbox[2] - ep_bbox[0]
    draw.rounded_rectangle([ep_x, badge_y, ep_x + ep_w + 30, badge_y + 46], radius=12, fill="#1E293B", outline="#64748B", width=2)
    draw.text((ep_x + 15, badge_y + 7), episode_tag, font=font_badge, fill="#F8FAFC")

    # Threat / Pattern Interrupt Badge (Top Right)
    threat_badge = "AI ตบกะโหลก!"
    threat_bbox = draw.textbbox((0, 0), threat_badge, font=font_badge_threat)
    threat_w = threat_bbox[2] - threat_bbox[0]
    th_x1 = width - threat_w - 75
    draw.rounded_rectangle([th_x1, badge_y, width - 45, badge_y + 46], radius=12, fill="#450A0A", outline="#EF4444", width=2)
    draw.text((th_x1 + 15, badge_y + 6), threat_badge, font=font_badge_threat, fill="#FCA5A5")

    # 4. Line 1: High-Contrast Disruptive Hook
    l1_bbox = draw.textbbox((0, 0), line1, font=font_l1)
    l1_w = l1_bbox[2] - l1_bbox[0]
    l1_x = (width - l1_w) // 2
    l1_y = headline_top

    # Heavy drop shadow + deep stroke for maximum punch
    for dx, dy in [(-3, -3), (3, -3), (-3, 3), (3, 3), (0, 5), (0, -3), (-3, 0), (3, 0)]:
        draw.text((l1_x + dx, l1_y + dy), line1, font=font_l1, fill="#000000")
    draw.text((l1_x, l1_y), line1, font=font_l1, fill=line1_color, stroke_width=7, stroke_fill="#000000")

    # 5. Line 2: The Iconic /cover Red Rounded Box (#E50000)
    l2_bbox = draw.textbbox((0, 0), line2, font=font_l2)
    l2_w = l2_bbox[2] - l2_bbox[0]
    l2_h = l2_bbox[3] - l2_bbox[1]

    pad_x = 42
    pad_y = 15
    box_w = l2_w + pad_x * 2
    box_h = 104
    box_x1 = (width - box_w) // 2
    box_y1 = l1_y + 98
    box_x2 = box_x1 + box_w
    box_y2 = box_y1 + box_h

    # 3D Box Shadow
    draw.rounded_rectangle([box_x1 + 8, box_y1 + 8, box_x2 + 8, box_y2 + 8], radius=24, fill="#000000")
    # Red Box (#E50000)
    draw.rounded_rectangle([box_x1, box_y1, box_x2, box_y2], radius=24, fill="#E50000")

    # Text inside red box (Pure white with 3D bevel effect)
    text_l2_x = box_x1 + pad_x
    text_l2_y = box_y1 + pad_y - 2
    draw.text((text_l2_x + 2, text_l2_y + 2), line2, font=font_l2, fill="#7F1D1D")
    draw.text((text_l2_x, text_l2_y), line2, font=font_l2, fill="#FFFFFF")

    # 6. Sub-tag Pill below the red box
    if sub_text:
        sub_y = box_y2 + 20
        sub_bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
        sub_w = sub_bbox[2] - sub_bbox[0]
        sub_x = (width - sub_w) // 2

        draw.rounded_rectangle([sub_x - 22, sub_y, sub_x + sub_w + 22, sub_y + 44], radius=14, fill=(11, 15, 25, 240), outline="#F59E0B", width=2)
        draw.text((sub_x, sub_y + 5), sub_text, font=font_sub, fill="#FBBF24")

    # 7. Bottom Branding Bar (Subtle, sleek footer)
    foot_text = "The CEO Unfiltered • บันทึกดิบหลังโต๊ะทำงาน"
    draw.text((width - 430, height - 38), foot_text, font=font_foot, fill="#CBD5E1")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=98)
    print(f"[OK] Rendered Cover: {output_path}")
    return output_path


def main():
    base_assets = "C:/My Claw/MyProjects/The CEO Unfiltered/assets"
    books_fire_raw = os.path.join(base_assets, "EP01_interrupt_books_fire_raw.jpg")
    zombie_ceo_raw = os.path.join(base_assets, "EP01_interrupt_zombie_ceo_raw.jpg")

    print("[*] Generating Pattern Interrupt Covers for EP.01...")

    # Variant 1: Burning Books + "ตื่นตี 5 ตามหนังสือ... ชีวิตมึงรวยขึ้นกี่โมง?!"
    render_pattern_cover(
        bg_image_path=books_fire_raw,
        output_path=os.path.join(base_assets, "EP01_interrupt_v1_books_fire_sarcastic.jpg"),
        line1="ตื่นตี 5 ตามหนังสือ...",
        line2="ชีวิตมึงรวยขึ้นกี่โมง?!",
        sub_text="80% นิทานหลอกแดก vs 20% ฟิสิกส์โลกความจริง",
        line1_color="#FFF200",  # Neon Yellow
        headline_top=110,
    )

    # Variant 2: Burning Books + "หนังสือพัฒนาตัวเอง... แต่งมาหลอกเด็กหรือเรื่องจริง?!"
    render_pattern_cover(
        bg_image_path=books_fire_raw,
        output_path=os.path.join(base_assets, "EP01_interrupt_v2_books_fire_truth.jpg"),
        line1="หนังสือพัฒนาตัวเอง...",
        line2="แต่งมาหลอกเด็กหรือเรื่องจริง?!",
        sub_text="ผ่าลึก: ทำไมคนทำตาม 99% ถึงยังไม่รวยสักที",
        line1_color="#FFFFFF",  # Pure White
        headline_top=110,
    )

    # Variant 3: 5 AM Zombie Tech Founder + "ยิ่งตื่นตี 5 ตามหนังสือ... ยิ่งทำชีวิตมึงพังยับ!"
    # Positioned at top=75 to leave the eyes completely uncovered
    render_pattern_cover(
        bg_image_path=zombie_ceo_raw,
        output_path=os.path.join(base_assets, "EP01_interrupt_v3_zombie_breakdown.jpg"),
        line1="ยิ่งฝืนตื่นตี 5 ตามหนังสือ...",
        line2="ยิ่งทำชีวิตมึงพังยับ!",
        sub_text="ทุนนิยมจ่ายให้คานผ่อนแรง ไม่ได้จ่ายให้คนตื่นเช้า!",
        line1_color="#FFF200",  # Neon Yellow
        headline_top=65,
        dark_vignette_height=0.45,
        dark_alpha=235,
    )

    # Variant 4: 5 AM Zombie Tech Founder + "อ่านจบเป็น 100 เล่ม... ทำไมมึงยังจนเหมือนเดิม?!"
    render_pattern_cover(
        bg_image_path=zombie_ceo_raw,
        output_path=os.path.join(base_assets, "EP01_interrupt_v4_zombie_poor.jpg"),
        line1="อ่านจบเป็น 100 เล่ม...",
        line2="ทำไมมึงยังจนเหมือนเดิม?!",
        sub_text="เลิกเป็นเหยื่อผู้เสพ • เริ่มสร้างระบบทำงานแทน",
        line1_color="#FFFFFF",  # Pure White
        headline_top=65,
        dark_vignette_height=0.45,
        dark_alpha=235,
    )

    print("\n[SUCCESS] All 4 Pattern Interrupt Master Covers Rendered Successfully!")


if __name__ == "__main__":
    main()
