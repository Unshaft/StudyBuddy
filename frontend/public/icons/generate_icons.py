"""
Génère les icônes PWA pour StudyBuddy.
Exécuter depuis le dossier frontend/public/icons/ :
    python generate_icons.py

Nécessite Pillow :
    pip install Pillow
"""
from PIL import Image, ImageDraw, ImageFont
import os

INDIGO = (99, 102, 241)   # #6366F1
WHITE  = (255, 255, 255)

SIZES = [192, 512]


def rounded_rectangle(draw: ImageDraw.ImageDraw, xy, radius: int, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + 2 * radius, y0 + 2 * radius], fill=fill)
    draw.ellipse([x1 - 2 * radius, y0, x1, y0 + 2 * radius], fill=fill)
    draw.ellipse([x0, y1 - 2 * radius, x0 + 2 * radius, y1], fill=fill)
    draw.ellipse([x1 - 2 * radius, y1 - 2 * radius, x1, y1], fill=fill)


def generate_icon(size: int):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fond arrondi indigo
    radius = size // 5
    rounded_rectangle(draw, [0, 0, size, size], radius, INDIGO)

    # Lettres "SB" centrées
    font_size = size // 3
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()

    text = "SB"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2
    y = (size - text_h) // 2 - bbox[1]
    draw.text((x, y), text, font=font, fill=WHITE)

    out_path = os.path.join(os.path.dirname(__file__), f"icon-{size}.png")
    img.save(out_path, "PNG")
    print(f"  ✓ icon-{size}.png ({size}x{size})")


if __name__ == "__main__":
    print("Génération des icônes PWA StudyBuddy...")
    for s in SIZES:
        generate_icon(s)
    print("Terminé.")
