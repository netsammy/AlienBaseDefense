import os
import sys
import time
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = r"C:\Users\abdus\AppData\Roaming\Python\Python311\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
SOUNDTRACK = ROOT / "store-assets" / "trailer_soundtrack.aac"
TEMP_DIR = ROOT / "store-assets" / "temp_recordings"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

WIN_OUT_DIR = ROOT / "store-assets" / "windows-store" / "trailer"
WIN_OUT_DIR.mkdir(parents=True, exist_ok=True)
WIN_TRAILER = WIN_OUT_DIR / "AlienBaseDefense-Windows-Trailer-v1.1.1.mp4"

MOBI_OUT_DIR = ROOT / "store-assets" / "google-play" / "trailer"
MOBI_OUT_DIR.mkdir(parents=True, exist_ok=True)
MOBI_TRAILER = MOBI_OUT_DIR / "AlienBaseDefense-Pixel7Pro-Trailer-v1.1.1.mp4"

def record_gameplay(is_mobile=False):
    target_dir = TEMP_DIR / ("mobile" if is_mobile else "desktop")
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if a recent recording already exists
    recent_videos = list(target_dir.glob("*.webm"))
    if recent_videos and recent_videos[0].stat().st_size > 3000000:
        print(f"Using existing recording: {recent_videos[0]}")
        return str(recent_videos[0])

    print(f"=== Starting recording (is_mobile={is_mobile}) ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-angle=d3d11",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                "--no-sandbox",
                "--disable-web-security"
            ]
        )

        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(target_dir),
            record_video_size={"width": 1920, "height": 1080},
            has_touch=is_mobile
        )
        page = context.new_page()
        page.goto("https://netsammy.github.io/AlienBaseDefense/", wait_until="networkidle")
        page.wait_for_timeout(3000)

        if is_mobile:
            page.evaluate("""() => {
                document.body.classList.add('show-touch-controls');
                if (window.game) window.game.showTouchControls = true;
                const toggle = document.getElementById('touchControlsToggle');
                if (toggle) toggle.checked = true;
            }""")
            page.wait_for_timeout(500)

        page.wait_for_timeout(2000)

        print("Deploying mission...")
        page.locator("#startButton").click()
        page.wait_for_timeout(3000)

        print("Starting combat sequence...")
        weapons = ["1", "2", "3", "4", "5"]
        move_keys = ["KeyW", "KeyD", "KeyS", "KeyA"]

        for step in range(35):
            w = weapons[step % len(weapons)]
            page.keyboard.press(w)
            
            mk = move_keys[step % len(move_keys)]
            page.keyboard.down(mk)
            
            offset_x = (step % 7 - 3) * 120
            offset_y = (step % 5 - 2) * 50
            page.mouse.move(960 + offset_x, 540 + offset_y)
            
            for _ in range(3):
                page.mouse.down()
                page.wait_for_timeout(100)
                page.mouse.up()
                page.wait_for_timeout(60)

            page.keyboard.up(mk)

            if step == 8:
                page.keyboard.press("KeyQ")
            elif step == 16:
                page.keyboard.press("KeyF")
            elif step == 22:
                page.keyboard.press("KeyT")
            elif step == 28:
                page.keyboard.down("KeyZ")
                page.wait_for_timeout(600)
                page.mouse.down()
                page.wait_for_timeout(150)
                page.mouse.up()
                page.keyboard.up("KeyZ")

            page.wait_for_timeout(300)

        print("Ending recording session...")
        page.wait_for_timeout(1000)
        page.close()
        video_path = page.video.path()
        context.close()
        browser.close()
        print(f"Recorded video saved to: {video_path}")
        return video_path

def create_trailer(raw_video, output_path, is_mobile=False):
    print(f"=== Encoding trailer to: {output_path} ===")
    
    if is_mobile:
        title1 = "ALIEN BASE DEFENSE - MOBILE"
        sub1 = "OPTIMIZED FOR PIXEL 7 PRO & ANDROID - 60 FPS"
        tag2 = "TACTICAL TOUCH CONTROLS"
        tag3 = "5 WEAPONS & 6 CITY SECTORS"
        tag4 = "ENLARGED ALIEN SWARMS & GOLIATH BOSS"
        end_title = "DEFEND THE PERIMETER"
        end_sub = "AVAILABLE ON GOOGLE PLAY"
    else:
        title1 = "ALIEN BASE DEFENSE - 3D FPS"
        sub1 = "WINDOWS EDITION - SURVIVAL SHOOTER"
        tag2 = "6 CITIES DEFENSE BATTLEGROUND"
        tag3 = "EXPANDED 5-WEAPON ARSENAL"
        tag4 = "BIO-TITAN GOLIATH BOSS ENCOUNTER"
        end_title = "DEFEND EARTH - SURVIVE THE INVASION"
        end_sub = "PLAY FREE ON WINDOWS STORE"

    filter_lines = [
        "scale=1920:1080",
        "fps=30",
        # Intro Title Overlay (0s - 3.5s)
        "drawbox=y=ih-200:color=black@0.65:width=iw:height=180:t=fill:enable='between(t,0,3.5)'",
        f"drawtext=text='{title1}':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=h-175:enable='between(t,0,3.5)'",
        f"drawtext=text='{sub1}':fontcolor=0x00d6ff:fontsize=28:x=(w-text_w)/2:y=h-115:enable='between(t,0,3.5)'",
        # Tag 2 Overlay (3.5s - 11s)
        "drawbox=x=60:y=60:color=black@0.6:width=780:height=70:t=fill:enable='between(t,3.5,11)'",
        f"drawtext=text='{tag2}':fontcolor=0xffb046:fontsize=32:x=90:y=78:enable='between(t,3.5,11)'",
        # Tag 3 Overlay (11s - 19s)
        "drawbox=x=60:y=60:color=black@0.6:width=820:height=70:t=fill:enable='between(t,11,19)'",
        f"drawtext=text='{tag3}':fontcolor=0x00d6ff:fontsize=32:x=90:y=78:enable='between(t,11,19)'",
        # Tag 4 Overlay (19s - 27s)
        "drawbox=x=60:y=60:color=black@0.6:width=900:height=70:t=fill:enable='between(t,19,27)'",
        f"drawtext=text='{tag4}':fontcolor=0xff4455:fontsize=32:x=90:y=78:enable='between(t,19,27)'",
        # Outro Endcard Overlay (27s - 32s)
        "drawbox=color=black@0.85:width=iw:height=ih:t=fill:enable='between(t,27,32)'",
        f"drawtext=text='{end_title}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=400:enable='between(t,27,32)'",
        f"drawtext=text='{end_sub}':fontcolor=0x00d6ff:fontsize=38:x=(w-text_w)/2:y=500:enable='between(t,27,32)'",
        "drawbox=x=(iw-340)/2:y=580:width=340:height=60:color=0xffb046@0.9:t=fill:enable='between(t,27,32)'",
        "drawtext=text='PLAY NOW':fontcolor=black:fontsize=32:x=(w-text_w)/2:y=594:enable='between(t,27,32)'",
        # Fade in & out
        "fade=t=in:st=0:d=0.5",
        "fade=t=out:st=31.2:d=0.8"
    ]
    
    script_path = TEMP_DIR / ("filter_mobi.txt" if is_mobile else "filter_win.txt")
    script_path.write_text(",".join(filter_lines), encoding="utf-8")

    cmd = [
        FFMPEG,
        "-y",
        "-ss", "00:00:01",
        "-t", "32",
        "-i", str(raw_video),
        "-ss", "00:00:05",
        "-t", "32",
        "-i", str(SOUNDTRACK),
        "-filter_script:v", str(script_path),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(output_path)
    ]

    print("Running ffmpeg...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg error:", res.stderr)
        raise RuntimeError(f"FFmpeg failed: {res.stderr}")
    print(f"Successfully generated: {output_path}")

def main():
    print("--- 1/2 Generating Windows Desktop Trailer ---")
    win_raw = record_gameplay(is_mobile=False)
    create_trailer(win_raw, WIN_TRAILER, is_mobile=False)

    print("--- 2/2 Generating Pixel 7 Pro Mobile Trailer ---")
    mobi_raw = record_gameplay(is_mobile=True)
    create_trailer(mobi_raw, MOBI_TRAILER, is_mobile=True)

    print("\nALL TRAILERS GENERATED SUCCESSFULLY!")
    print(f"Windows Trailer: {WIN_TRAILER}")
    print(f"Pixel 7 Pro Trailer: {MOBI_TRAILER}")

if __name__ == "__main__":
    main()
