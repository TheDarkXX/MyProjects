#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import requests

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PAGE_TOKEN = "EAAGtgBXMXW4BSmwcwFlUOJwPVcMqLBMxPnRAIPhI2sf17Kj7yWkn6gMLiVp8fYGGp6wu6xkzxQtaHSiGLg8HKm3CGWIYgfNwQLp0qXe8YfZBrtCZBsh7wrh6ZASLC9XZBKq2iVZAwf9Bgc6dT62eu6KYz2ubNxgkSRcq80tBWnZCeDeWpNh9ZBBQ4uJ0YqGMTKaZAb3t4dbL6C2W2AQr3i4kJ5S3"
POST_ID = "1362033773652952_122096033883500794"

comment_body = """[AI ตบกะโหลก]:

กูบอกเลย... มันจริงแค่ 20% ที่เป็นแก่นฟิสิกส์ ส่วนอีก 80% คือ "นิทานหลอกแดกเงินคนขี้แพ้" ที่เอาพฤติกรรมผิวเผินมาเคลือบน้ำตาลขาย!

1. กองขยะ 80%: สิ่งที่แต่งมาหลอกเด็ก
- ตื่นตี 5, อาบน้ำเย็น, จัดเตียงนอน: ถ้าตื่นตี 4 แล้วทำงานหนักทำให้รวยจริง ป่านนี้คนส่งผักตลาดไทเป็นมหาเศรษฐีโลกไปหมดแล้ว!
- ภาพลวงตาผู้รอดชีวิต (Survivorship Bias): หนังสือสัมภาษณ์คนที่รอด 1 คน แต่ไม่เคยสัมภาษณ์คนอีก 9,999 คนที่ตื่นเช้าเหมือนกันเป๊ะแต่เจ๊งล้มละลาย
- กับดักโดปามีน (Self-Help Trap): อ่านจบ ฟิน คิดว่าตัวเองเก่งขึ้น แต่ชีวิตจริงยังเป็นทาสเหมือนเดิม

2. ทองคำ 20%: สิ่งที่โคตรจริงในโลกความจริง
- ทนต่องานน่าเบื่อ (Boredom Tolerance): คนสำเร็จตัวจริงทนอยู่กับ Process ซ้ำซากหน้างานได้นานกว่าคนอื่น
- กฎคานผ่อนแรง (Leverage Over Sweat): ทุนนิยมไม่จ่ายเงินให้คนเหนื่อยที่สุด แต่จ่ายให้คนที่คุม "คานงัด" ใหญ่ที่สุด! คนใช้แรง = รายได้ตันที่ 24 ชม. แต่คนใช้ระบบ โค้ด สื่อ และการลงทุน = เครื่องจักรทบต้นแทน 24 ชม.!
- อัตลักษณ์ (Identity): ต้องมองตัวเองเป็น "ผู้ผลิตระบบ ไม่ใช่เหยื่อผู้เสพ"

ถามตัวเองก่อนนอน 3 ข้อ:
1. วันนี้ธุรกิจมึงส่งมอบคุณค่าแก้ปัญหาให้ลูกค้าจริงๆ หรือยัง?
2. วันนี้มึงสร้างระบบที่ทำงานแทนมึง หรือยังใช้แรงแลกเงินทื่อๆ?
3. วันนี้มึงเป็น "ผู้ผลิต" หรือเป็น "เหยื่อผู้เสพ" ที่นั่งอ่านหนังสือเพ้อเจ้อ?

#TheCEOUnfiltered #AIตบกะโหลก #Leverage"""

url = f"https://graph.facebook.com/v25.0/{POST_ID}/comments"
res = requests.post(url, data={"access_token": PAGE_TOKEN, "message": comment_body}, timeout=30)
data = res.json()
print("Comment Result:", data)
