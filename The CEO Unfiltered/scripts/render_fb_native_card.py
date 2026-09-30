import os
from PIL import Image, ImageDraw, ImageFont

def render_fb_native_card():
    output_path = 'C:/My Claw/MyProjects/The CEO Unfiltered/assets/EP01_fb_native_colored_card.png'
    width, height = 1080, 1080

    # 1. Create Facebook-style deep fiery red/dark gradient background
    img = Image.new('RGB', (width, height), color='#1A0508')
    draw = ImageDraw.Draw(img)

    for y in range(height):
        ratio = y / height
        # Gradient from deep dark wine red to intense dark crimson
        r = int(24 + 110 * (1 - abs(ratio - 0.5) * 1.5))
        g = int(5 + 15 * (1 - ratio))
        b = int(8 + 20 * (1 - ratio))
        r = max(18, min(140, r))
        g = max(4, min(30, g))
        b = max(6, min(35, b))
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    thai_bold = 'C:/Windows/Fonts/Leelawdb.ttf'
    segoe_bold = 'C:/Windows/Fonts/segoeuib.ttf'

    font_badge = ImageFont.truetype(segoe_bold, 28)
    font_main = ImageFont.truetype(thai_bold, 54)
    font_punch = ImageFont.truetype(thai_bold, 58)
    font_cta = ImageFont.truetype(thai_bold, 36)

    # Top Brand Pill
    draw.rounded_rectangle([80, 70, 480, 126], radius=16, fill='#111827', outline='#F87171', width=2)
    draw.text((105, 80), "THE CEO UNFILTERED", font=font_badge, fill='#F87171')

    # 2. Main Native Centered Text
    lines = [
        ("เมื่อคืนตอนเที่ยงคืน", font_main, '#F1F5F9'),
        ("กูพิมพ์ถาม AI เล่นๆ ว่า:", font_main, '#CBD5E1'),
        ("", font_main, '#FFFFFF'),
        ("\"พวกหนังสือพัฒนาตัวเอง", font_punch, '#FDE047'),
        ("ตื่นตี 5 อาบน้ำเย็น จัดเตียง", font_punch, '#FDE047'),
        ("มันจริงไหม หรือแค่หลอกเด็ก?\"", font_punch, '#FDE047'),
        ("", font_main, '#FFFFFF'),
        ("แม่งตอบกลับมาคำแรก:", font_main, '#E2E8F0'),
        ("'จริงแค่ 20% ที่เป็นฟิสิกส์!", font_punch, '#FFFFFF'),
        ("อีก 80% คือนิทานหลอกแดกเงิน!'", font_punch, '#FCA5A5'),
        ("", font_main, '#FFFFFF'),
        (">>> อ่านคำตอบฉบับเต็มต่อในคอมเมนต์ <<<", font_cta, '#38BDF8')
    ]

    total_h = sum(60 if t else 20 for t, f, c in lines)
    start_y = (height - total_h) // 2 + 30

    cur_y = start_y
    for text, font, color in lines:
        if text:
            bbox = draw.textbbox((0, 0), text, font=font)
            line_w = bbox[2] - bbox[0]
            x = (width - line_w) // 2
            # Drop shadow
            draw.text((x + 3, cur_y + 3), text, font=font, fill='#000000')
            draw.text((x, cur_y), text, font=font, fill=color)
            cur_y += 62
        else:
            cur_y += 24

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=98)
    print(f"[OK] Rendered FB Native Colored Card to: {output_path}")

if __name__ == '__main__':
    render_fb_native_card()
