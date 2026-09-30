import os
from PIL import Image, ImageDraw, ImageFont

def render_book_headline_cover():
    base_image_path = 'C:/Users/Admin/.gemini/antigravity-ide/brain/4c95f702-2e00-469c-bfcf-b89da2919f53/ep01_books_pile_1790791417940.jpg'
    output_path = 'C:/My Claw/MyProjects/The CEO Unfiltered/assets/EP01_style4_books_headline.jpg'

    img = Image.open(base_image_path).convert('RGB')
    width, height = img.size

    # Create dark gradient vignette at the top 45% of image so white text pops with 100% readability
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    top_fade_height = int(height * 0.42)
    for y in range(top_fade_height):
        # Quadratic curve for smooth luxury shadow
        alpha = int(210 * (1 - (y / top_fade_height) ** 1.3))
        overlay_draw.line([(0, y), (width, y)], fill=(5, 8, 14, alpha))

    # Composite overlay
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    thai_bold = 'C:/Windows/Fonts/Leelawdb.ttf'
    segoe_bold = 'C:/Windows/Fonts/segoeuib.ttf'

    font_badge = ImageFont.truetype(segoe_bold, 28)
    font_h1 = ImageFont.truetype(thai_bold, 68)
    font_h2 = ImageFont.truetype(thai_bold, 68)
    font_sub = ImageFont.truetype(thai_bold, 30)

    # 1. Badge Pill at top
    badge_x, badge_y = 60, 55
    badge_w, badge_h = 360, 48
    draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=14, fill='#0F172A', outline='#38BDF8', width=2)
    draw.text((badge_x + 20, badge_y + 8), "THE CEO UNFILTERED", font=font_badge, fill='#38BDF8')

    # EP Pill tag next to badge
    ep_x = badge_x + badge_w + 15
    draw.rounded_rectangle([ep_x, badge_y, ep_x + 115, badge_y + badge_h], radius=14, fill='#1E293B', outline='#64748B', width=2)
    draw.text((ep_x + 18, badge_y + 8), "EP.01", font=font_badge, fill='#F8FAFC')

    # 2. Main Headline
    line1 = "อ่านเป็น 100 เล่ม..."
    line2 = "เรื่องจริง หรือ หลอกเด็ก?"

    # Drop shadow for extra pop
    shadow_offset = 3
    draw.text((60 + shadow_offset, 135 + shadow_offset), line1, font=font_h1, fill='#000000')
    draw.text((60, 135), line1, font=font_h1, fill='#FFFFFF')

    # Line 2: with accent color on "หลอกเด็ก?"
    draw.text((60 + shadow_offset, 225 + shadow_offset), line2, font=font_h2, fill='#000000')
    
    # Measure width of "เรื่องจริง หรือ " to colorize "หลอกเด็ก?"
    prefix = "เรื่องจริง หรือ "
    bbox_prefix = draw.textbbox((60, 225), prefix, font=font_h2)
    prefix_w = bbox_prefix[2] - bbox_prefix[0]

    draw.text((60, 225), prefix, font=font_h2, fill='#FFFFFF')
    draw.text((60 + prefix_w, 225), "หลอกเด็ก?", font=font_h2, fill='#F87171')

    # 3. Sub-headline highlight pill
    sub_y = 320
    sub_text = "ผ่าความจริง: 80% นิทานขายฝัน vs 20% ฟิสิกส์โลกจริง"
    draw.rounded_rectangle([60, sub_y, 740, sub_y + 50], radius=12, fill=(15, 23, 42, 220), outline='#F59E0B', width=2)
    draw.text((80, sub_y + 8), sub_text, font=font_sub, fill='#FBBF24')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=98)
    print(f"[OK] Rendered Book Headline Cover to: {output_path}")

if __name__ == '__main__':
    render_book_headline_cover()
