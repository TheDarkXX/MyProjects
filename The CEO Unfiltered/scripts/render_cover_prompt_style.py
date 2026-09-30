import os
from PIL import Image, ImageDraw, ImageFont

def render_prompt_style_cover(line1, line2, output_path, line1_color="#FFFFFF", is_yellow=False):
    base_image_path = 'C:/Users/Admin/.gemini/antigravity-ide/brain/4c95f702-2e00-469c-bfcf-b89da2919f53/ep01_books_pile_1790791417940.jpg'
    
    img = Image.open(base_image_path).convert('RGB')
    width, height = img.size

    # 1. Dark vignette on top half so text has maximum contrast
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    top_fade_height = int(height * 0.48)
    for y in range(top_fade_height):
        alpha = int(225 * (1 - (y / top_fade_height) ** 1.25))
        overlay_draw.line([(0, y), (width, y)], fill=(5, 8, 14, alpha))

    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    # 2. Load Prompt Fonts
    font_bold_path = 'C:/XBrain/tools/tiktok-poster/data/fonts/Prompt-Bold.otf'
    font_black_path = 'C:/XBrain/tools/tiktok-poster/data/fonts/Prompt-Black.ttf'
    segoe_bold = 'C:/Windows/Fonts/segoeuib.ttf'

    font_badge = ImageFont.truetype(segoe_bold, 26)
    font_l1 = ImageFont.truetype(font_black_path, 72)
    font_l2 = ImageFont.truetype(font_black_path, 72)
    font_sub = ImageFont.truetype(font_bold_path, 32)

    # 3. Top Badges: THE CEO UNFILTERED • EP.01
    badge_y = 45
    draw.rounded_rectangle([60, badge_y, 440, badge_y + 46], radius=12, fill='#0B0F19', outline='#38BDF8', width=2)
    draw.text((80, badge_y + 6), "THE CEO UNFILTERED", font=font_badge, fill='#38BDF8')

    ep_x = 455
    draw.rounded_rectangle([ep_x, badge_y, ep_x + 115, badge_y + 46], radius=12, fill='#1E293B', outline='#64748B', width=2)
    draw.text((ep_x + 18, badge_y + 6), "EP.01", font=font_badge, fill='#F8FAFC')

    # 4. Line 1: /cover formula (White or Yellow with heavy black stroke + drop shadow)
    l1_color = "#FFF200" if is_yellow else line1_color
    l1_y = 125

    # Measure Line 1 to center or left-align (Let's center it for maximum /cover style!)
    bbox_l1 = draw.textbbox((0, 0), line1, font=font_l1)
    l1_w = bbox_l1[2] - bbox_l1[0]
    l1_x = (width - l1_w) // 2

    # Draw heavy black stroke
    draw.text((l1_x, l1_y), line1, font=font_l1, fill=l1_color, stroke_width=8, stroke_fill='#000000')

    # 5. Line 2: The Iconic /cover Red Rounded Box (#E50000 with 20px radius)
    bbox_l2 = draw.textbbox((0, 0), line2, font=font_l2)
    l2_w = bbox_l2[2] - bbox_l2[0]
    l2_h = bbox_l2[3] - bbox_l2[0]

    pad_x = 36
    pad_y = 14
    box_w = l2_w + pad_x * 2
    box_h = 100
    box_x1 = (width - box_w) // 2
    box_y1 = l1_y + 105
    box_x2 = box_x1 + box_w
    box_y2 = box_y1 + box_h

    # Deep drop shadow for the box
    draw.rounded_rectangle([box_x1 + 6, box_y1 + 6, box_x2 + 6, box_y2 + 6], radius=22, fill='#000000')
    # Red Box (#E50000)
    draw.rounded_rectangle([box_x1, box_y1, box_x2, box_y2], radius=22, fill='#E50000')

    # Text inside red box (Pure white with subtle drop shadow)
    text_l2_x = box_x1 + pad_x
    text_l2_y = box_y1 + pad_y - 2
    draw.text((text_l2_x + 2, text_l2_y + 2), line2, font=font_l2, fill='#8B0000')
    draw.text((text_l2_x, text_l2_y), line2, font=font_l2, fill='#FFFFFF')

    # 6. Sub-tag Pill below the red box
    sub_y = box_y2 + 25
    sub_text = "ผ่าความจริง: 80% นิทานขายฝัน vs 20% ฟิสิกส์โลกจริง"
    bbox_sub = draw.textbbox((0, 0), sub_text, font=font_sub)
    sub_w = bbox_sub[2] - bbox_sub[0]
    sub_x = (width - sub_w) // 2

    draw.rounded_rectangle([sub_x - 20, sub_y, sub_x + sub_w + 20, sub_y + 48], radius=14, fill=(11, 15, 25, 230), outline='#F59E0B', width=2)
    draw.text((sub_x, sub_y + 5), sub_text, font=font_sub, fill='#FBBF24')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=98)
    print(f"[OK] Rendered Prompt Cover to: {output_path}")

if __name__ == '__main__':
    # Variation A: "อ่านเป็น 100 เล่ม..." / "ทำไมยังไม่รวยสักที?"
    render_prompt_style_cover(
        line1="อ่านเป็น 100 เล่ม...",
        line2="ทำไมยังไม่รวยสักที?",
        output_path='C:/My Claw/MyProjects/The CEO Unfiltered/assets/EP01_cover_style_A.jpg',
        is_yellow=True
    )

    # Variation B: "หนังสือพัฒนาตัวเอง" / "เรื่องจริง หรือ หลอกเด็ก?"
    render_prompt_style_cover(
        line1="หนังสือพัฒนาตัวเอง",
        line2="เรื่องจริง หรือ หลอกเด็ก?",
        output_path='C:/My Claw/MyProjects/The CEO Unfiltered/assets/EP01_cover_style_B.jpg',
        line1_color="#FFFFFF"
    )

    # Variation C: "ถ้าตื่นตี 5 แล้วรวย" / "คนส่งผักคงเป็นมหาเศรษฐี!"
    render_prompt_style_cover(
        line1="ถ้าตื่นตี 5 แล้วรวย...",
        line2="คนส่งผักคงเป็นมหาเศรษฐี!",
        output_path='C:/My Claw/MyProjects/The CEO Unfiltered/assets/EP01_cover_style_C.jpg',
        is_yellow=True
    )
