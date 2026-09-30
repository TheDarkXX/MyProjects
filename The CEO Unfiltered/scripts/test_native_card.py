#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_native_card.py — Test Native Facebook Background Card with Auto-Comment
"""
import sys
import requests

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PAGE_ID = "1362033773652952"
PAGE_TOKEN = "EAAGtgBXMXW4BSmwcwFlUOJwPVcMqLBMxPnRAIPhI2sf17Kj7yWkn6gMLiVp8fYGGp6wu6xkzxQtaHSiGLg8HKm3CGWIYgfNwQLp0qXe8YfZBrtCZBsh7wrh6ZASLC9XZBKq2iVZAwf9Bgc6dT62eu6KYz2ubNxgkSRcq80tBWnZCeDeWpNh9ZBBQ4uJ0YqGMTKaZAb3t4dbL6C2W2AQr3i4kJ5S3"
GRAPH_VER = "v25.0"

# Available Presets:
# 1777259175857338 : 🔥 Fiery Orange
# 1007907569385540 : ⚫ Dark Gray/Black Gradient
# 1777259169190672 : 🟥 Pink/Purple Gradient
# 1007907572718873 : 🟦 Blue Gradient
# 1777259172524005 : 🟩 Green/Yellow Gradient
PRESET_ID = "1777259175857338"  # Fiery Orange

# Hook must be strictly < 130 characters and have NO links
hook_message = "นิสัยคนสำเร็จ ตื่นตี 5 อาบน้ำเย็น... มันจริง หรือแต่งมาหลอกเด็กวะ? (อ่านคำตอบ AI ในคอมเมนต์ 👇)"

print(f"[*] Posting Native Card (Length: {len(hook_message)} chars)...")

feed_url = f"https://graph.facebook.com/{GRAPH_VER}/{PAGE_ID}/feed"
feed_payload = {
    "access_token": PAGE_TOKEN,
    "message": hook_message,
    "text_format_preset_id": PRESET_ID,
}

res = requests.post(feed_url, data=feed_payload, timeout=20)
feed_data = res.json()

if "error" in feed_data:
    print(f"[FAILED] Error posting card: {feed_data['error']}")
    sys.exit(1)

post_id = feed_data["id"]
print(f"[OK] Native Card Post Created! Post ID: {post_id}")

# Now post the First Comment with the punchy explanation!
comment_text = """[AI ตบกะโหลก]:

กูบอกเลย... มันจริงแค่ 20% ที่เป็นแก่นฟิสิกส์ ส่วนอีก 80% คือ "นิทานหลอกแดกเงินคนขี้แพ้"!

ถ้าการตื่นตี 4 แล้วทำงานหนักทำให้รวยจริง ป่านนี้คนส่งผักตลาดไทหรือแม่ค้าร้านต้มเลือดหมูเป็นมหาเศรษฐีระดับโลกไปหมดแล้ว!

ทุนนิยมไม่ได้จ่ายเงินให้คนที่เหนื่อยที่สุด... แต่จ่ายให้คนที่คุม "คานผ่อนแรง (Leverage)" ที่ใหญ่ที่สุดต่างหาก!

คนใช้แรงแลกเงิน = รายได้ตันที่ 24 ชม.
แต่คนใช้ระบบ โค้ด สื่อ และการลงทุน = เครื่องจักรทำงานทบต้นแทน 24 ชม. แม้ตอนนอนหลับ!

เลิกถามตัวเองได้แล้วว่าพรุ่งนี้จะตื่นกี่โมง...
แต่ถามตัวเองก่อนนอนทุกคืนว่า: วันนี้มึงทำตัวเป็น "ผู้ผลิตระบบ" หรือยังเป็นแค่ "เหยื่อผู้เสพ"? 🔥

#TheCEOUnfiltered #AIตบกะโหลก #ความจริงโลกธุรกิจ #Leverage"""

print("[*] Adding First Comment...")
comment_url = f"https://graph.facebook.com/{GRAPH_VER}/{post_id}/comments"
c_payload = {
    "access_token": PAGE_TOKEN,
    "message": comment_text,
}

c_res = requests.post(comment_url, data=c_payload, timeout=20)
c_data = c_res.json()

if "error" in c_data:
    print(f"[WARN] Error posting comment: {c_data['error']}")
else:
    print(f"[OK] First Comment Added! Comment ID: {c_data.get('id')}")

# Get permalink
perm_res = requests.get(f"https://graph.facebook.com/{GRAPH_VER}/{post_id}", params={"fields": "permalink_url", "access_token": PAGE_TOKEN})
perm_data = perm_res.json()
print("=" * 60)
print(f"🚀 LIVE URL: {perm_data.get('permalink_url')}")
print("=" * 60)
