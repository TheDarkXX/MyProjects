import os
from PIL import Image, ImageDraw, ImageFont

def render_thai_chat_cover(output_path):
    width, height = 1080, 1080
    img = Image.new('RGB', (width, height), color='#090D14')
    draw = ImageDraw.Draw(img)

    # Font definitions
    thai_bold = 'C:/Windows/Fonts/Leelawdb.ttf'
    thai_reg = 'C:/Windows/Fonts/LeelawUI.ttf'
    segoe_bold = 'C:/Windows/Fonts/segoeuib.ttf'

    font_badge = ImageFont.truetype(segoe_bold, 28)
    font_meta = ImageFont.truetype(thai_reg, 24)
    font_name_ceo = ImageFont.truetype(thai_bold, 28)
    font_name_ai = ImageFont.truetype(thai_bold, 28)
    font_body = ImageFont.truetype(thai_bold, 36)
    font_body_ai = ImageFont.truetype(thai_bold, 38)
    font_footer = ImageFont.truetype(thai_bold, 30)

    # Background subtle ambient glow (top & bottom)
    for y in range(height):
        ratio = y / height
        r = int(9 + 8 * (1 - ratio))
        g = int(13 + 10 * (1 - ratio))
        b = int(20 + 20 * (1 - ratio))
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Top Header Pill Card
    draw.rounded_rectangle([70, 70, 1010, 155], radius=24, fill='#131924', outline='#2A3447', width=2)
    
    # Header Badge: THE CEO UNFILTERED
    draw.rounded_rectangle([95, 87, 400, 137], radius=16, fill='#1E293B', outline='#38BDF8', width=2)
    draw.text((115, 96), "THE CEO UNFILTERED", font=font_badge, fill='#38BDF8')
    
    # Meta Status Right
    status_text = "• บันทึกแชทเที่ยงคืน 00:15 | ห้องบัญชาการลับ"
    draw.text((430, 102), status_text, font=font_meta, fill='#94A3B8')

    # ==========================================
    # Bubble 1: CEO Question (Top)
    # ==========================================
    b1_x1, b1_y1, b1_x2, b1_y2 = 70, 195, 1010, 480
    draw.rounded_rectangle([b1_x1, b1_y1, b1_x2, b1_y2], radius=28, fill='#151C28', outline='#2D3B52', width=2)

    # Avatar Circle CEO
    draw.ellipse([105, 225, 165, 285], fill='#2563EB', outline='#60A5FA', width=2)
    draw.text((115, 237), "CEO", font=ImageFont.truetype(segoe_bold, 22), fill='#FFFFFF')

    # Sender Name + Time
    draw.text((185, 235), "The CEO", font=font_name_ceo, fill='#60A5FA')
    draw.text((310, 240), "• เมื่อคืน 00:15", font=font_meta, fill='#64748B')

    # Message text
    q_lines = [
        "มึง... ถามจริง พวกหนังสือพัฒนาตัวเอง",
        "ตื่นตี 5 อาบน้ำเย็น จัดเตียงพวกนั้น",
        "มันยังจริงไหม หรือแค่แต่งมาหลอกเด็กวะ?"
    ]
    cur_y = 300
    for line in q_lines:
        draw.text((110, cur_y), line, font=font_body, fill='#F8FAFC')
        cur_y += 52

    # ==========================================
    # Bubble 2: Savage AI Answer (Bottom - The Slam)
    # ==========================================
    b2_x1, b2_y1, b2_x2, b2_y2 = 70, 520, 1010, 930
    draw.rounded_rectangle([b2_x1, b2_y1, b2_x2, b2_y2], radius=28, fill='#1A141A', outline='#B91C1C', width=3)

    # Avatar Circle AI (Fire Red)
    draw.ellipse([105, 550, 165, 610], fill='#DC2626', outline='#F87171', width=2)
    draw.text((122, 563), "AI", font=ImageFont.truetype(segoe_bold, 22), fill='#FFFFFF')

    # Sender Name + Time
    draw.text((185, 560), "Savage AI (มารบูรพา) [สายฟิสิกส์]", font=font_name_ai, fill='#F87171')
    draw.text((610, 565), "• ตอบกลับทันที", font=font_meta, fill='#64748B')

    # AI Roast Message
    ans_lines = [
        ("กูบอกเลย... มันจริงแค่ 20% ที่เป็นฟิสิกส์!", '#FBBF24'),
        ("อีก 80% คือนิทานหลอกแดกเงินคนขี้แพ้!", '#EF4444'),
        ("", '#FFFFFF'),
        ("ถ้าตื่นตี 4 แล้วรวยจริง ป่านนี้คนส่งผักตลาดไท", '#F1F5F9'),
        ("เป็นอีลอน มัสก์ไปหมดแล้ว!", '#38BDF8')
    ]
    cur_y = 635
    for line, color in ans_lines:
        if line:
            draw.text((110, cur_y), line, font=font_body_ai, fill=color)
            cur_y += 56
        else:
            cur_y += 20

    # ==========================================
    # Bottom Call to Action Footer
    # ==========================================
    draw.rounded_rectangle([70, 965, 1010, 1030], radius=20, fill='#0F172A', outline='#334155', width=1)
    footer_text = ">>> อ่านคำตอบตบกะโหลก 4 เสาความจริงต่อในแคปชั่น <<<"
    draw.text((160, 977), footer_text, font=font_footer, fill='#38BDF8')

    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=98)
    print(f"[OK] Rendered Thai Dark Chat Cover to: {output_path}")

if __name__ == '__main__':
    target = 'C:/My Claw/MyProjects/The CEO Unfiltered/assets/EP01_dark_chat_thai.png'
    render_thai_chat_cover(target)
