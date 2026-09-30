#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_native_card.py — Native Facebook Color Card Image Generator
================================================================
Renders pixel-perfect 1:1 or 4:5 native-style Facebook background cards
using Thai typography (Leelawadee UI Bold) and authentic Meta gradients.
"""
import os
import sys
import math
from PIL import Image, ImageDraw, ImageFont

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ─── Facebook Gradient Presets ──────────────────────────────────────────────
GRADIENTS = {
    "fiery": {
        "name": "🔥 Fiery Orange / Red",
        "start": (245, 75, 50),     # #F54B32
        "end": (255, 140, 0),       # #FF8C00
        "angle": 45,
    },
    "dark_cyber": {
        "name": "⚫ Dark Cyber (CEO Style)",
        "start": (15, 23, 42),      # #0F172A
        "end": (30, 41, 59),        # #1E293B
        "angle": 135,
    },
    "purple_pink": {
        "name": "🟣 Purple / Magenta",
        "start": (138, 35, 135),    # #8A2387
        "end": (233, 64, 87),       # #E94057
        "angle": 45,
    },
    "midnight_blue": {
        "name": "🟦 Midnight Deep Blue",
        "start": (10, 40, 110),     # #0A286E
        "end": (30, 120, 220),      # #1E78DC
        "angle": 135,
    },
    "emerald": {
        "name": "🟢 Emerald Teal",
        "start": (6, 95, 70),       # #065F46
        "end": (16, 185, 129),      # #10B981
        "angle": 45,
    }
}

FONT_PATHS = [
    "C:/Windows/Fonts/LeelaUIb.ttf",
    "C:/Windows/Fonts/leelawdb.ttf",
    "C:/Windows/Fonts/tahomabd.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


def get_bold_font(size):
    for fp in FONT_PATHS:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()


def create_gradient_image(width, height, color_start, color_end, angle_deg=45):
    """Generates a smooth linear gradient background."""
    base = Image.new("RGB", (width, height), color_start)
    top = Image.new("RGB", (width, height), color_end)
    mask = Image.new("L", (width, height))
    mask_data = []

    angle_rad = math.radians(angle_deg)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    # Normalize gradient across diagonal
    max_d = abs(width * cos_a) + abs(height * sin_a)

    for y in range(height):
        for x in range(width):
            # Projection onto gradient axis
            proj = (x - width / 2) * cos_a + (y - height / 2) * sin_a + max_d / 2
            val = max(0, min(255, int((proj / max_d) * 255)))
            mask_data.append(val)

    mask.putdata(mask_data)
    return Image.composite(top, base, mask)


def wrap_text(text, font, max_width, draw):
    """Smart word-wrapping for Thai and English."""
    # Split text by explicit newlines first
    paragraphs = text.split("\n")
    final_lines = []

    for para in paragraphs:
        if not para.strip():
            final_lines.append("")
            continue

        words = para.split(" ")
        current_line = ""

        for word in words:
            test_line = f"{current_line} {word}".strip() if current_line else word
            bbox = draw.textbbox((0, 0), test_line, font=font)
            line_w = bbox[2] - bbox[0]

            if line_w <= max_width:
                current_line = test_line
            else:
                if current_line:
                    final_lines.append(current_line)
                    current_line = word
                else:
                    # Word itself is wider than max_width, split by characters
                    chars = list(word)
                    chunk = ""
                    for c in chars:
                        test_chunk = chunk + c
                        c_bbox = draw.textbbox((0, 0), test_chunk, font=font)
                        if (c_bbox[2] - c_bbox[0]) <= max_width:
                            chunk = test_chunk
                        else:
                            final_lines.append(chunk)
                            chunk = c
                    current_line = chunk

        if current_line:
            final_lines.append(current_line)

    return final_lines


def clean_card_text(text):
    """Keeps only Thai characters and ASCII printable characters to prevent missing glyphs."""
    # Replace common emoji pointers with clean punctuation
    replacements = {
        "👇": "...",
        "👉": "...",
        "🔥": "",
        "🚀": "",
        "📌": "•",
        "💡": "•",
        "▼": "...",
        "►": "...",
    }
    for emo, rep in replacements.items():
        text = text.replace(emo, rep)

    # Filter to only ASCII (0x20-0x7E, 0x0A) and Thai (0x0E01-0x0E5B)
    allowed = []
    for c in text:
        code = ord(c)
        if (0x20 <= code <= 0x7E) or code == 0x0A or (0x0E01 <= code <= 0x0E5B):
            allowed.append(c)
        elif c in ["\r", "\t"]:
            allowed.append(" ")
    return "".join(allowed)


def render_native_fb_card(
    text,
    output_path="native_card.jpg",
    preset="fiery",
    width=1080,
    height=1080,
    font_size=68,
    footer_text=""
):
    """
    Renders the complete Facebook native-style card.
    """
    text = clean_card_text(text)
    grad_config = GRADIENTS.get(preset, GRADIENTS["fiery"])
    img = create_gradient_image(
        width,
        height,
        grad_config["start"],
        grad_config["end"],
        angle_deg=grad_config["angle"]
    )
    draw = ImageDraw.Draw(img)

    margin_x = int(width * 0.10)  # 10% side margins
    max_text_w = width - (margin_x * 2)

    # Auto-adjust font size if text is long
    current_size = font_size
    lines = []
    font = None
    line_height = 0
    total_text_h = 0

    while current_size >= 36:
        font = get_bold_font(current_size)
        lines = wrap_text(text, font, max_text_w, draw)
        
        # Calculate height
        line_height = int(current_size * 1.45)
        total_text_h = len(lines) * line_height
        
        if total_text_h <= (height * 0.72):  # Fits comfortably in 72% of card height
            break
        current_size -= 4

    # Center text vertically
    start_y = (height - total_text_h) // 2

    # Draw Text with subtle Drop Shadow
    shadow_offset = 3
    shadow_color = (0, 0, 0, 110)
    text_color = (255, 255, 255)

    y = start_y
    for line in lines:
        if not line:
            y += int(line_height * 0.6)
            continue
            
        bbox = draw.textbbox((0, 0), line, font=font)
        w = bbox[2] - bbox[0]
        x = (width - w) // 2

        # Draw subtle shadow
        draw.text((x + shadow_offset, y + shadow_offset), line, font=font, fill=(0, 0, 0))
        # Draw white text
        draw.text((x, y), line, font=font, fill=text_color)
        y += line_height

    # Optional Footer / Brand Subtitle
    if footer_text:
        foot_text = clean_card_text(footer_text)
        foot_font = get_bold_font(28)
        foot_bbox = draw.textbbox((0, 0), foot_text, font=foot_font)
        foot_w = foot_bbox[2] - foot_bbox[0]
        foot_x = (width - foot_w) // 2
        foot_y = height - 70
        draw.text((foot_x, foot_y), foot_text, font=foot_font, fill=(255, 255, 255))

    img.save(output_path, "JPEG", quality=95)
    print(f"[OK] Generated Native FB Card: {output_path} ({width}x{height}, Preset: {grad_config['name']})")
    return output_path


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Native Facebook Style Card Image")
    parser.add_argument("text", nargs="?", default="นิสัยคนสำเร็จ ตื่นตี 5 อาบน้ำเย็น...\nมันจริง หรือแค่แต่งมาหลอกเด็กวะ?\n\n(กูไปถาม AI มา... คำตอบอยู่ในคอมเมนต์ ▼)", help="Text on card")
    parser.add_argument("-o", "--output", default="C:/My Claw/MyProjects/The CEO Unfiltered/drafts/test_native_card.jpg", help="Output JPG path")
    parser.add_argument("-p", "--preset", choices=list(GRADIENTS.keys()), default="fiery", help="Gradient preset")
    parser.add_argument("--footer", default="THE CEO UNFILTERED • บันทึกดิบหลังโต๊ะทำงาน", help="Footer text")

    args = parser.parse_args()
    render_native_fb_card(args.text, args.output, preset=args.preset, footer_text=args.footer)

