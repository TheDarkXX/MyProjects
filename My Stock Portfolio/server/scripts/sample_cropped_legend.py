from PIL import Image

img_path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\e5f22e6a-c947-495f-bfee-04d36c0840ec\.user_uploaded\media_1789018213415.png"
img = Image.open(img_path).convert('RGB')
w, h = img.size
print(f"Crop size: {w}x{h}")

# Find the row containing the color bars (bottom half of the image)
# Let's inspect rows from h-15 to h-2
for y in range(h - 15, h - 2):
    row_colors = [img.getpixel((x, y)) for x in range(0, w, 5)]
    unique = set(row_colors)
    print(f"y={y}: {len(unique)} unique colors")

# Let's sample horizontally across the middle of the colored bar
# The colored bar is around y = int(h * 0.75)
bar_y = int(h * 0.75)
print(f"\n--- Sampling across colored bar at y={bar_y} ---")
sampled_hex = []
for x in range(0, w, 3):
    r, g, b = img.getpixel((x, bar_y))
    hex_col = f"#{r:02X}{g:02X}{b:02X}"
    sampled_hex.append((x, hex_col))

# Group consecutive identical or similar colors to find each segment
segments = []
curr_seg = []
for x, c in sampled_hex:
    if not curr_seg or curr_seg[-1][1] == c:
        curr_seg.append((x, c))
    else:
        segments.append(curr_seg)
        curr_seg = [(x, c)]
if curr_seg:
    segments.append(curr_seg)

for s in segments:
    if len(s) > 2:
        print(f"Segment from x={s[0][0]} to {s[-1][0]} (width {len(s)*3}px): {s[len(s)//2][1]}")
