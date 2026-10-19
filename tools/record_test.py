from pathlib import Path
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
VID_DIR = ROOT / "store-assets" / "test_videos"
VID_DIR.mkdir(parents=True, exist_ok=True)

def record_test():
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
            record_video_dir=str(VID_DIR),
            record_video_size={"width": 1920, "height": 1080}
        )
        page = context.new_page()
        print("Navigating...")
        page.goto("https://netsammy.github.io/AlienBaseDefense/", wait_until="networkidle")
        page.wait_for_timeout(3000)
        
        # Click Start
        print("Clicking deploy mission...")
        page.locator("#startButton").click()
        page.wait_for_timeout(3000)
        
        # Gameplay loop: shoot, switch weapons, move
        print("Simulating combat...")
        canvas = page.locator("#renderCanvas")
        for i in range(25):
            # Move mouse around center
            page.mouse.move(960 + (i % 5 - 2) * 80, 540 + ((i + 2) % 5 - 2) * 50)
            # Click to shoot
            page.mouse.down()
            page.wait_for_timeout(120)
            page.mouse.up()
            # Switch weapons
            weapon_key = str((i % 5) + 1)
            page.keyboard.press(weapon_key)
            # Move player
            page.keyboard.press("KeyW")
            page.wait_for_timeout(200)

        print("Finished gameplay test, closing context...")
        page.close()
        video_path = page.video.path()
        context.close()
        browser.close()
        print(f"Recorded video saved to: {video_path}")

if __name__ == "__main__":
    record_test()
