from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-assets" / "windows-store" / "trailer"
FRAMES = OUT / "frames"
WIDTH, HEIGHT = 1920, 1080
FPS = 30

SCENES = [
    {
        "image": ROOT / "store-assets/windows-store/screenshots-desktop/desktop-screenshot-01-1920x1080.png",
        "duration": 3.8,
        "title": "ALIEN BASE DEFENSE",
        "subtitle": "Hard Mode Survival Trailer",
        "tag": "DEFEND THE CORE",
        "zoom": (1.02, 1.10),
    },
    {
        "image": ROOT / "store-assets/windows-store/screenshots-desktop/desktop-screenshot-03-1920x1080.png",
        "duration": 4.4,
        "title": "HARD MODE WAVES",
        "subtitle": "Fast aliens. Low margin. No room to drift.",
        "tag": "MODE: HARD",
        "zoom": (1.05, 1.18),
    },
    {
        "image": ROOT / "store-assets/google-play/phone-screenshot-04-combat-hud-1920x1080.png",
        "duration": 4.4,
        "title": "360 COMBAT CONTROL",
        "subtitle": "Track threats with radar and hold the defense ring.",
        "tag": "ALIENS CLOSING",
        "zoom": (1.04, 1.16),
    },
    {
        "image": ROOT / "store-assets/windows-store/screenshots-desktop/desktop-screenshot-04-1920x1080.png",
        "duration": 4.4,
        "title": "BASE SHIELD UNDER FIRE",
        "subtitle": "Keep enemies out of the red zone or the base falls.",
        "tag": "SHIELD ALERT",
        "zoom": (1.03, 1.14),
    },
    {
        "image": ROOT / "store-assets/windows-store/screenshots-desktop/desktop-screenshot-02-1920x1080.png",
        "duration": 4.0,
        "title": "UPGRADE BETWEEN WAVES",
        "subtitle": "Tune rifle damage, fire rate, shield strength, and turrets.",
        "tag": "RUN REWARDS",
        "zoom": (1.02, 1.10),
    },
    {
        "image": ROOT / "store-assets/google-play/feature-graphic-1024x500.png",
        "duration": 3.0,
        "title": "SURVIVE THE INVASION",
        "subtitle": "Alien Base Defense - Windows Store",
        "tag": "PLAY HARD MODE",
        "zoom": (1.0, 1.0),
        "endcard": True,
    },
]


def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


TITLE = font(84, True)
SUBTITLE = font(34)
TAG = font(26, True)
SMALL = font(24, True)


def cover_image(path):
    image = Image.open(path).convert("RGB")
    scale = max(WIDTH / image.width, HEIGHT / image.height)
    new_size = (math.ceil(image.width * scale), math.ceil(image.height * scale))
    image = image.resize(new_size, Image.Resampling.LANCZOS)
    left = (image.width - WIDTH) // 2
    top = (image.height - HEIGHT) // 2
    return image.crop((left, top, left + WIDTH, top + HEIGHT))


def zoom_frame(base, zoom, pan_x, pan_y):
    scaled = base.resize((round(WIDTH * zoom), round(HEIGHT * zoom)), Image.Resampling.LANCZOS)
    max_x = scaled.width - WIDTH
    max_y = scaled.height - HEIGHT
    left = round(max_x * pan_x)
    top = round(max_y * pan_y)
    return scaled.crop((left, top, left + WIDTH, top + HEIGHT))


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_with_shadow(draw, xy, text, fnt, fill, anchor="la", shadow=(0, 0, 0, 170)):
    x, y = xy
    for dx, dy in [(-3, 3), (3, 3), (0, 4)]:
      draw.text((x + dx, y + dy), text, font=fnt, fill=shadow, anchor=anchor)
    draw.text(xy, text, font=fnt, fill=fill, anchor=anchor)


def add_vignette(frame):
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(0, 0, 0, 18))
    for i in range(22):
        alpha = int(5 + i * 3.2)
        draw.rectangle((i * 16, i * 9, WIDTH - i * 16, HEIGHT - i * 9), outline=(0, 214, 255, max(0, 34 - i)))
        draw.rectangle((i * 18, i * 10, WIDTH - i * 18, HEIGHT - i * 10), outline=(0, 0, 0, alpha))
    return Image.alpha_composite(frame.convert("RGBA"), overlay)


def draw_overlay(frame, scene, scene_progress, global_progress):
    frame = add_vignette(frame)
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    fade = min(1, scene_progress / 0.16, (1 - scene_progress) / 0.16)
    alpha = int(230 * max(0, fade))
    panel = (24, 706, 920, 1002) if not scene.get("endcard") else (0, 0, WIDTH, HEIGHT)

    if scene.get("endcard"):
        draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(0, 8, 16, 168))
        cx = WIDTH // 2
        text_with_shadow(draw, (cx, 420), scene["title"], TITLE, (255, 255, 255, alpha), anchor="mm")
        text_with_shadow(draw, (cx, 508), scene["subtitle"], SUBTITLE, (191, 246, 255, alpha), anchor="mm")
        rounded_rect(draw, (cx - 230, 585, cx + 230, 650), 32, (255, 176, 70, alpha), None)
        draw.text((cx, 618), scene["tag"], font=TAG, fill=(16, 8, 0, alpha), anchor="mm")
    else:
        rounded_rect(draw, panel, 18, (0, 12, 24, int(188 * fade)), (0, 214, 255, int(150 * fade)), 2)
        rounded_rect(draw, (48, 728, 278, 774), 23, (255, 174, 74, alpha), None)
        draw.text((163, 751), scene["tag"], font=TAG, fill=(15, 8, 0, alpha), anchor="mm")
        text_with_shadow(draw, (52, 826), scene["title"], TITLE, (255, 255, 255, alpha))
        text_with_shadow(draw, (56, 908), scene["subtitle"], SUBTITLE, (191, 246, 255, alpha))

    # Progress bar.
    bar_left, bar_top, bar_right, bar_bottom = 60, 1026, WIDTH - 60, 1038
    rounded_rect(draw, (bar_left, bar_top, bar_right, bar_bottom), 6, (191, 246, 255, 70), None)
    rounded_rect(draw, (bar_left, bar_top, bar_left + int((bar_right - bar_left) * global_progress), bar_bottom), 6, (0, 214, 255, 220), None)
    draw.text((WIDTH - 62, 990), "HARD MODE GAMEPLAY", font=SMALL, fill=(191, 246, 255, alpha), anchor="ra")

    return Image.alpha_composite(frame, overlay).convert("RGB")


def main():
    FRAMES.mkdir(parents=True, exist_ok=True)
    for old in FRAMES.glob("frame_*.png"):
        old.unlink()

    loaded = [cover_image(scene["image"]) for scene in SCENES]
    total_frames = sum(round(scene["duration"] * FPS) for scene in SCENES)
    frame_index = 0

    for scene, base in zip(SCENES, loaded):
        scene_frames = round(scene["duration"] * FPS)
        start_zoom, end_zoom = scene["zoom"]
        for i in range(scene_frames):
            p = i / max(1, scene_frames - 1)
            ease = p * p * (3 - 2 * p)
            zoom = start_zoom + (end_zoom - start_zoom) * ease
            pan_x = 0.5 + math.sin(ease * math.pi * 0.8) * 0.08
            pan_y = 0.5 + math.cos(ease * math.pi) * 0.045
            frame = zoom_frame(base, zoom, pan_x, pan_y)
            frame = draw_overlay(frame, scene, p, frame_index / max(1, total_frames - 1))
            frame.save(FRAMES / f"frame_{frame_index:05d}.png", optimize=False)
            frame_index += 1

    print(FRAMES)


if __name__ == "__main__":
    main()
