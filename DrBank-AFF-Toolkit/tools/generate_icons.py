import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_tech_logo(size=512):
    # High-res canvas for antialiased super-sampling
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = size / 2.0
    radius = size * 0.44

    # 1. Outer Hexagon / Rounded Shield Background with Gradient
    # Deep Cyberpunk Charcoal-Navy
    # Draw rounded rectangle badge
    pad = size * 0.04
    r_corner = size * 0.22
    
    # Outer Glow Layer
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=r_corner,
        fill=(238, 77, 45, 90) # Shopee flame glow
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.03))
    img.paste(glow, (0, 0), glow)

    # Base Dark Glass Shield
    # Top-to-bottom gradient #181926 to #0d0e15
    base_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(base_mask).rounded_rectangle(
        [pad + 4, pad + 4, size - pad - 4, size - pad - 4],
        radius=r_corner,
        fill=255
    )
    
    shield = Image.new("RGBA", (size, size))
    for y in range(size):
        ratio = y / float(size)
        r = int(24 * (1 - ratio) + 12 * ratio)
        g = int(26 * (1 - ratio) + 14 * ratio)
        b = int(38 * (1 - ratio) + 24 * ratio)
        for x in range(size):
            shield.putpixel((x, y), (r, g, b, 255))
    img.paste(shield, (0, 0), base_mask)

    # Futuristic Border (Cyber Orange to Neon Amber)
    draw.rounded_rectangle(
        [pad + 4, pad + 4, size - pad - 4, size - pad - 4],
        radius=r_corner,
        outline=(255, 90, 40, 220),
        width=int(size * 0.024)
    )

    # Corner Tech Accent Notches
    notch_len = size * 0.12
    # Top Left
    draw.line([(pad + 16, pad + 16), (pad + 16 + notch_len, pad + 16)], fill=(255, 200, 50, 240), width=int(size * 0.015))
    draw.line([(pad + 16, pad + 16), (pad + 16, pad + 16 + notch_len)], fill=(255, 200, 50, 240), width=int(size * 0.015))
    # Bottom Right
    draw.line([(size - pad - 16, size - pad - 16), (size - pad - 16 - notch_len, size - pad - 16)], fill=(255, 90, 40, 240), width=int(size * 0.015))
    draw.line([(size - pad - 16, size - pad - 16), (size - pad - 16, size - pad - 16 - notch_len)], fill=(255, 90, 40, 240), width=int(size * 0.015))

    # 2. Tech Radar Concentric Ring (Golden Ratio Radar)
    radar_cx, radar_cy = center, center * 0.98
    for r_rad, alpha in [(size * 0.32, 40), (size * 0.22, 60)]:
        draw.ellipse(
            [radar_cx - r_rad, radar_cy - r_rad, radar_cx + r_rad, radar_cy + r_rad],
            outline=(255, 120, 50, alpha),
            width=max(1, int(size * 0.008))
        )

    # 3. Dynamic Sharp Lightning Bolt (Golden Amber to Shopee Blaze Gradient)
    # Polygon vertices for a high-velocity, precision angular bolt
    # Coordinate fractions:
    bolt_coords = [
        (0.56, 0.18), # Top tip
        (0.35, 0.48), # Inner fold left
        (0.48, 0.48), # Shelf right
        (0.38, 0.82), # Bottom sharp tip
        (0.66, 0.46), # Inner fold right
        (0.51, 0.46)  # Shelf left
    ]
    bolt_pts = [(x * size, y * size) for x, y in bolt_coords]

    # Bolt Drop Shadow / Ambient Neon Glow
    bolt_glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bolt_glow_draw = ImageDraw.Draw(bolt_glow)
    bolt_glow_draw.polygon(bolt_pts, fill=(255, 80, 20, 220))
    bolt_glow = bolt_glow.filter(ImageFilter.GaussianBlur(radius=size * 0.045))
    img.paste(bolt_glow, (0, 0), bolt_glow)

    # Main Bolt Polygon (Pure Neon Amber Gradient)
    bolt_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(bolt_mask).polygon(bolt_pts, fill=255)

    bolt_fill = Image.new("RGBA", (size, size))
    for y in range(size):
        ratio = max(0.0, min(1.0, (y - size * 0.18) / (size * 0.65)))
        # Top: Electric Gold (255, 230, 80) -> Bottom: Hyper Crimson-Orange (255, 60, 20)
        r = 255
        g = int(235 * (1 - ratio) + 60 * ratio)
        b = int(80 * (1 - ratio) + 15 * ratio)
        for x in range(size):
            bolt_fill.putpixel((x, y), (r, g, b, 255))
    img.paste(bolt_fill, (0, 0), bolt_mask)

    # Inner Core Facet Highlight (3D Specular Sheen on Left Bevel)
    bevel_coords = [
        (0.56, 0.18),
        (0.35, 0.48),
        (0.48, 0.48),
        (0.44, 0.53),
        (0.38, 0.50),
        (0.53, 0.22)
    ]
    bevel_pts = [(x * size, y * size) for x, y in bevel_coords]
    draw.polygon(bevel_pts, fill=(255, 255, 255, 120))

    # Center Power Node / Diamond Flash
    spark_cx, spark_cy = size * 0.48, size * 0.47
    spark_r = size * 0.02
    draw.ellipse([spark_cx - spark_r, spark_cy - spark_r, spark_cx + spark_r, spark_cy + spark_r], fill=(255, 255, 255, 230))

    # Small Tech Target Reticle Dot
    draw.ellipse([size * 0.72 - 4, size * 0.28 - 4, size * 0.72 + 4, size * 0.28 + 4], fill=(16, 185, 129, 255)) # Green Radar Dot

    return img

def main():
    out_dir = r"c:\My Claw\MyProjects\DrBank-AFF-Toolkit\images"
    os.makedirs(out_dir, exist_ok=True)
    
    master = create_tech_logo(size=512)
    master.save(os.path.join(out_dir, "icon512.png"))

    # Generate crisp downscaled versions
    for sz in [128, 48, 16]:
        resized = master.resize((sz, sz), Image.Resampling.LANCZOS)
        # Extra slight contrast sharpen for small 16px icon
        if sz == 16:
            resized = resized.filter(ImageFilter.SHARPEN)
        resized.save(os.path.join(out_dir, f"icon{sz}.png"))
        print(f"Generated icon{sz}.png")

if __name__ == "__main__":
    main()

