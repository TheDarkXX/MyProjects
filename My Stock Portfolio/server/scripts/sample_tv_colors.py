import sys
from PIL import Image

img_path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e5f22e6a-c947-495f-bfee-04d36c0840ec\.user_uploaded\media_1789018094427.png"
img = Image.open(img_path).convert('RGB')
w, h = img.size
print(f"Image size: {w}x{h}")

def get_hex(x, y):
    r, g, b = img.getpixel((x, y))
    return f"#{r:02X}{g:02X}{b:02X}"

# Let's inspect points of interest:
# 1. Background / Canvas (top near toolbar)
print("Canvas background (10, 10):", get_hex(10, 10))
print("Sector container header bg (50, 105):", get_hex(50, 105))

# 2. AAPL tile (-0.28%) - bottom left area
# In 1000x444 image:
# NVDA is top-left, AAPL is bottom-left
print("NVDA (-0.91%) center (150, 260):", get_hex(150, 260))
print("AAPL (-0.28%) center (150, 680 if h~800 or ratio):")

# Let's sample along a vertical line in NVDA and AAPL:
for y_pct in [0.2, 0.3, 0.4, 0.6, 0.7, 0.8]:
    y = int(h * y_pct)
    x = int(w * 0.15)
    print(f"x={x}, y={y} ({y_pct*100}%): {get_hex(x, y)}")

# META (+6.55%) is near bottom middle
# GOOGL (-2.28%) is middle
# MSFT (-0.47%) is middle right of Tech services
# AMZN (-1.78%) is Retail trade
for x_pct in [0.15, 0.3, 0.4, 0.5, 0.65, 0.8, 0.95]:
    for y_pct in [0.25, 0.5, 0.75]:
        x = int(w * x_pct)
        y = int(h * y_pct)
        print(f"Sample at ({x_pct:.2f}, {y_pct:.2f}) -> pos ({x}, {y}): {get_hex(x, y)}")
