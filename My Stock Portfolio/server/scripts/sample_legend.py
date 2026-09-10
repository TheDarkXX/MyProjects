from PIL import Image

img_path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e5f22e6a-c947-495f-bfee-04d36c0840ec\.user_uploaded\media_1789018094427.png"
img = Image.open(img_path).convert('RGB')
w, h = img.size

# Look at bottom strip
print("Checking bottom row y values:")
for y in range(h - 30, h, 3):
    colors = set()
    for x in range(0, w, 20):
        colors.add(img.getpixel((x, y)))
    if any(c != (0,0,0) for c in colors):
        print(f"y={y} has {len(colors)} unique colors")

# In media_1789018071970.png (Image 1, side by side), the right side has TradingView!
# Let's inspect media_1789018071970.png as well!
