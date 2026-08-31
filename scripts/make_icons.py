from PIL import Image
from pathlib import Path

src = Path("resources/icon.png")
if not src.exists():
    raise SystemExit("resources/icon.png bulunamadi")

img = Image.open(src).convert("RGBA")
w, h = img.size
side = max(w, h)
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(img, ((side - w) // 2, (side - h) // 2), img)

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
fg_sizes = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

res = Path("android/app/src/main/res")
for folder, size in sizes.items():
    out_dir = res / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    icon = canvas.resize((size, size), Image.Resampling.LANCZOS)
    for name in ("ic_launcher.png", "ic_launcher_round.png"):
        icon.save(out_dir / name, "PNG")
        print("wrote", out_dir / name)

for folder, size in fg_sizes.items():
    out_dir = res / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    pad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.66)
    small = canvas.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = (size - inner) // 2
    pad.paste(small, (offset, offset), small)
    pad.save(out_dir / "ic_launcher_foreground.png", "PNG")
    print("wrote", out_dir / "ic_launcher_foreground.png")

anydpi = res / "mipmap-anydpi-v26"
anydpi.mkdir(parents=True, exist_ok=True)
xml = """<?xml version=\"1.0\" encoding=\"utf-8\"?>
<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">
    <background android:drawable=\"@color/ic_launcher_background\"/>
    <foreground android:drawable=\"@mipmap/ic_launcher_foreground\"/>
</adaptive-icon>
"""
for xml_name in ("ic_launcher.xml", "ic_launcher_round.xml"):
    (anydpi / xml_name).write_text(xml, encoding="utf-8")

values = res / "values"
values.mkdir(parents=True, exist_ok=True)
(values / "ic_launcher_background.xml").write_text(
    """<?xml version=\"1.0\" encoding=\"utf-8\"?>
<resources>
    <color name=\"ic_launcher_background\">#0B1B3A</color>
</resources>
""",
    encoding="utf-8",
)
print("Icon generation OK")
