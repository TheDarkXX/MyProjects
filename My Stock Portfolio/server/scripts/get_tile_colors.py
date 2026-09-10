from PIL import Image
from collections import Counter

img_path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e5f22e6a-c947-495f-bfee-04d36c0840ec\.user_uploaded\media_1789018094427.png"
img = Image.open(img_path).convert('RGB')

def get_dominant_color(box):
    # box = (x0, y0, x1, y1)
    colors = []
    for x in range(box[0], box[2], 2):
        for y in range(box[1], box[3], 2):
            colors.append(img.getpixel((x, y)))
    c = Counter(colors)
    # top most common color
    top = c.most_common(1)[0][0]
    return f"#{top[0]:02X}{top[1]:02X}{top[2]:02X}"

print("NVDA tile mode:", get_dominant_color((50, 100, 200, 250)))
print("AAPL tile mode:", get_dominant_color((50, 280, 200, 400)))
print("GOOGL tile mode:", get_dominant_color((450, 100, 550, 300)))
print("MSFT tile mode:", get_dominant_color((600, 100, 700, 300)))
print("AMZN tile mode:", get_dominant_color((740, 100, 880, 280)))
print("MU tile mode:", get_dominant_color((360, 100, 420, 200)))
print("AMD tile mode:", get_dominant_color((240, 220, 330, 280)))
print("META tile mode:", get_dominant_color((450, 320, 560, 410)))
print("SPCX tile mode:", get_dominant_color((910, 100, 990, 280)))
