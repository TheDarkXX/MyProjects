# 🛡️ Source of Truth Backups (My Stock Portfolio)

โฟลเดอร์นี้บรรจุข้อมูล **Source of Truth** ตัวจริงของทั้ง 2 พอร์ตการลงทุน:
1. **Doctorbank Growth** (`fcfdd1e0-bf53-4910-89e7-8ca2474d4c27`) — 52 Transactions
2. **Tiger** (`1c32059d-7847-41c8-a45f-311b3ade67b7`) — 57 Transactions (รวม NVDA 6 ไม้ + ปันผล 3 ครั้ง)
**รวมทั้งหมด 109 Transactions**

---

## 📂 รายชื่อไฟล์สำรอง

| ไฟล์ | รูปแบบ | รายละเอียด |
| :--- | :--- | :--- |
| `transactions_all.json` | JSON | ธุรกรรมทั้งหมด 109 รายการ พร้อม metadata ครบถ้วน |
| `transactions_all.csv` | CSV | ธุรกรรมทั้งหมดเปิดดูใน Excel / Google Sheets ได้ทันที |
| `transactions_doctorbank_growth.json` / `.csv` | JSON / CSV | เฉพาะพอร์ต Doctorbank Growth (52 รายการ) |
| `transactions_tiger.json` / `.csv` | JSON / CSV | เฉพาะพอร์ต Tiger (57 รายการ รวม NVDA, SCHG, ปันผล, ดอกเบี้ย) |
| `transactions_dump.sql` | SQL | สคริปต์คำสั่ง SQL `INSERT OR REPLACE` ยิงเข้า SQLite ได้ทุกที่ |
| `portfolios.json` | JSON | ข้อมูลพอร์ตโฟลิโอ |
| `blueprints.json` | JSON | สัดส่วนเป้าหมาย Asset Allocation Blueprint |
| `stock_metadata.json` | JSON | ข้อมูลหุ้น, Sector, ปันผล, โลโก้ |
| `latest_prices.json` | JSON | ราคาตลาดล่าสุดของหุ้นทุกตัว |

---

## 🚀 วิธีกู้คืนข้อมูลแบบ 1 คลิก (Disaster Recovery)

หากฐานข้อมูลเสียหาย หรือเกิดเหตุไม่คาดฝัน สามารถสั่งกู้คืนได้ทันทีด้วยคำสั่งเดียว:

```bash
# บนเซิร์ฟเวอร์ VPS:
node /root/stock-portfolio/server/restore_source_of_truth.js
pm2 reload stock-api
```
ระบบจะดึงข้อมูลจากโฟลเดอร์นี้ไปสร้างฐานข้อมูลใหม่ให้ตรง 100% ภายใน 1 วินาที
