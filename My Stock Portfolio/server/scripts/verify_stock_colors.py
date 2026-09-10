from PIL import Image

img_path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e5f22e6a-c947-495f-bfee-04d36c0840ec\.user_uploaded\media_1789018094427.png"
img = Image.open(img_path).convert('RGB')

# Let's sample specific stocks from Image 2:
# 1. AAPL (-0.28%): in Electronic technology, bottom left
print("AAPL (-0.28%):", f"#{img.getpixel((150, 320))[0]:02X}{img.getpixel((150, 320))[1]:02X}{img.getpixel((150, 320))[2]:02X}")

# 2. MSFT (-0.47%): in Tech services, middle right
print("MSFT (-0.47%):", f"#{img.getpixel((660, 200))[0]:02X}{img.getpixel((660, 200))[1]:02X}{img.getpixel((660, 200))[2]:02X}")

# 3. TSLA (-0.10%): Consumer durables
print("TSLA (-0.10%):", f"#{img.getpixel((780, 680 if img.size[1] > 500 else 280))[0]:02X}{img.getpixel((780, 280))[1]:02X}{img.getpixel((780, 280))[2]:02X}")

# 4. WMT (-0.21%): Retail trade
print("WMT (-0.21%):", f"#{img.getpixel((670, 360))[0]:02X}{img.getpixel((670, 360))[1]:02X}{img.getpixel((670, 360))[2]:02X}")

# 5. NVDA (-0.91%): Electronic technology, top left
print("NVDA (-0.91%):", f"#{img.getpixel((150, 180))[0]:02X}{img.getpixel((150, 180))[1]:02X}{img.getpixel((150, 180))[2]:02X}")

# 6. AVGO (-1.13%): Electronic technology
print("AVGO (-1.13%):", f"#{img.getpixel((300, 200))[0]:02X}{img.getpixel((300, 200))[1]:02X}{img.getpixel((300, 200))[2]:02X}")

# 7. GOOGL (-2.28%): Technology services
print("GOOGL (-2.28%):", f"#{img.getpixel((520, 200))[0]:02X}{img.getpixel((520, 200))[1]:02X}{img.getpixel((520, 200))[2]:02X}")

# 8. SPCX (-3.86%): Communications
print("SPCX (-3.86%):", f"#{img.getpixel((950, 200))[0]:02X}{img.getpixel((950, 200))[1]:02X}{img.getpixel((950, 200))[2]:02X}")

# 9. CSCO (+0.24%): Electronic tech
print("CSCO (+0.24%):", f"#{img.getpixel((265, 390))[0]:02X}{img.getpixel((265, 390))[1]:02X}{img.getpixel((265, 390))[2]:02X}")

# 10. ARM (+1.03%): Electronic tech
print("ARM (+1.03%):", f"#{img.getpixel((310, 365))[0]:02X}{img.getpixel((310, 365))[1]:02X}{img.getpixel((310, 365))[2]:02X}")

# 11. INTC (+1.69%): Electronic tech
print("INTC (+1.69%):", f"#{img.getpixel((265, 340))[0]:02X}{img.getpixel((265, 340))[1]:02X}{img.getpixel((265, 340))[2]:02X}")

# 12. MU (+2.75%): Electronic tech
print("MU (+2.75%):", f"#{img.getpixel((390, 180))[0]:02X}{img.getpixel((390, 180))[1]:02X}{img.getpixel((390, 180))[2]:02X}")

# 13. AMD (+3.04%): Electronic tech
print("AMD (+3.04%):", f"#{img.getpixel((300, 260))[0]:02X}{img.getpixel((300, 260))[1]:02X}{img.getpixel((300, 260))[2]:02X}")

# 14. META (+6.55%): Technology services
print("META (+6.55%):", f"#{img.getpixel((500, 370))[0]:02X}{img.getpixel((500, 370))[1]:02X}{img.getpixel((500, 370))[2]:02X}")
