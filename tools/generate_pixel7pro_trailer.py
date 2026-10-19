import os
import sys
import subprocess
from pathlib import Path

FFMPEG = r"C:\Users\abdus\AppData\Roaming\Python\Python311\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
SRC_VIDEO = r"G:\AI Games\Backup\videos\screen-20261012-112531-1791786219906.mp4"
SOUNDTRACK = r"G:\AI Games\AlienBaseDefenseGame\alien_base_defense_game\store-assets\trailer_soundtrack.aac"
OUTPUT_DIR = r"G:\AI Games\Backup\videos"
TEMP_DIR = os.path.join(OUTPUT_DIR, "temp_trailer_render")
os.makedirs(TEMP_DIR, exist_ok=True)

SEGMENTS = [
    {
        "id": "clip1_intro",
        "start": "00:00:00.000",
        "to": "00:00:03.500",
        "pos": "bottom",
        "title": "ALIEN BASE DEFENSE",
        "title_color": "white",
        "sub": "DEFEND THE LAST CITIES OF EARTH",
        "sub_color": "0x00d6ff"
    },
    {
        "id": "clip2_combat",
        "start": "00:00:09.500",
        "to": "00:00:17.000",
        "pos": "top",
        "title": "TACTICAL TOUCH CONTROLS",
        "title_color": "0xffb046",
        "sub": "FLUID DUAL-ZONE COMBAT - LOCKED 60 FPS",
        "sub_color": "white"
    },
    {
        "id": "clip3_upgrade",
        "start": "00:00:18.000",
        "to": "00:00:22.500",
        "pos": "top",
        "title": "SECTOR SECURED",
        "title_color": "0x00d6ff",
        "sub": "EARN CREDITS - UPGRADE WEAPONS & PERKS",
        "sub_color": "white"
    },
    {
        "id": "clip4_turret",
        "start": "00:00:31.000",
        "to": "00:00:38.000",
        "pos": "top",
        "title": "DEPLOY SENTRY TURRETS",
        "title_color": "0xffb046",
        "sub": "AUTOMATED DEFENSE & CRITICAL OVERCHARGES",
        "sub_color": "white"
    },
    {
        "id": "clip5_boss",
        "start": "00:00:56.000",
        "to": "00:01:15.000",
        "pos": "boss",
        "title": "GOLIATH BIO-TITAN BOSS",
        "title_color": "0xff3344",
        "sub": "SURVIVE MULTI-PHASE COLOSSAL ENCOUNTERS",
        "sub_color": "white"
    }
]

def run_cmd(cmd, desc="Running"):
    print(f"[{desc}]...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error in {desc}:", res.stderr)
        raise RuntimeError(f"Command failed: {res.stderr}")
    return res

def build_trailer(width, height, endcard_img, output_mp4, is_letterbox=False):
    print(f"\n==========================================")
    print(f"Building Trailer: {os.path.basename(output_mp4)} ({width}x{height})")
    print(f"==========================================")
    
    clip_files = []
    
    # 1. Render gameplay subclips
    for i, seg in enumerate(SEGMENTS):
        clip_out = os.path.join(TEMP_DIR, f"{width}x{height}_{seg['id']}.mp4")
        clip_files.append(clip_out)
        
        # Scaling filter
        if is_letterbox:
            # Scale preserving aspect ratio and pad with cinematic black bars to exact 1920x1080
            scale_filter = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,fps=60"
        else:
            # Native resolution scale
            scale_filter = f"scale={width}:{height},fps=60"
            
        # Banner filter calculation
        box_w = int(width * 0.48)
        box_h = int(height * 0.12)
        box_x = int((width - box_w) / 2)
        
        if seg["pos"] == "bottom":
            box_y = height - box_h - 40
            t_y = box_y + 15
            s_y = box_y + int(box_h * 0.58)
        elif seg["pos"] == "boss":
            box_y = int(height * 0.14)
            t_y = box_y + 14
            s_y = box_y + int(box_h * 0.58)
        else:
            box_y = 35
            t_y = box_y + 14
            s_y = box_y + int(box_h * 0.58)
            
        title_size = int(height * 0.042)
        sub_size = int(height * 0.025)
        
        # Draw box and text
        vf_chain = [
            scale_filter,
            f"drawbox=x={box_x}:y={box_y}:w={box_w}:h={box_h}:color=black@0.72:t=fill",
            f"drawbox=x={box_x}:y={box_y}:w={box_w}:h={box_h}:color={seg['title_color']}@0.85:t=2",
            f"drawtext=font='Arial':text='{seg['title']}':fontcolor={seg['title_color']}:fontsize={title_size}:x=(w-text_w)/2:y={t_y}",
            f"drawtext=font='Arial':text='{seg['sub']}':fontcolor={seg['sub_color']}:fontsize={sub_size}:x=(w-text_w)/2:y={s_y}"
        ]
        
        # Fade in on first clip
        if i == 0:
            vf_chain.append("fade=t=in:st=0:d=0.5")
            
        script_file = os.path.join(TEMP_DIR, f"filter_{width}x{height}_{seg['id']}.txt")
        with open(script_file, "w", encoding="utf-8") as sf:
            sf.write(",".join(vf_chain))
        
        cmd = [
            FFMPEG, "-y",
            "-ss", seg["start"],
            "-to", seg["to"],
            "-i", SRC_VIDEO,
            "-filter_script:v", script_file,
            "-c:v", "libx264", "-preset", "fast", "-crf", "19",
            "-af", "aresample=44100,aformat=channel_layouts=stereo",
            "-c:a", "aac", "-b:a", "192k",
            clip_out
        ]
        run_cmd(cmd, f"Extracting {seg['id']}")
        
    # 2. Render Endcard clip (4.5s)
    endcard_clip = os.path.join(TEMP_DIR, f"{width}x{height}_clip6_endcard.mp4")
    clip_files.append(endcard_clip)
    
    endcard_vf = [
        f"scale={width}:{height},fps=60",
        "fade=t=in:st=0:d=0.4",
        "fade=t=out:st=3.7:d=0.8"
    ]
    
    cmd_endcard = [
        FFMPEG, "-y",
        "-loop", "1",
        "-t", "4.5",
        "-i", endcard_img,
        "-f", "lavfi", "-t", "4.5", "-i", "anullsrc=r=44100:cl=stereo",
        "-vf", ",".join(endcard_vf),
        "-c:v", "libx264", "-preset", "fast", "-crf", "19",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        endcard_clip
    ]
    run_cmd(cmd_endcard, "Rendering endcard clip")
    
    # 3. Concatenate all subclips (video + in-game audio)
    concat_list_file = os.path.join(TEMP_DIR, f"concat_{width}x{height}.txt")
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for cf in clip_files:
            f.write(f"file '{Path(cf).as_posix()}'\n")
            
    concat_temp = os.path.join(TEMP_DIR, f"{width}x{height}_concat_raw.mp4")
    cmd_concat = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list_file,
        "-c", "copy",
        concat_temp
    ]
    run_cmd(cmd_concat, "Concatenating clips")
    
    # 4. Audio Mix: Layer gameplay audio with trailer synth soundtrack
    probe_cmd = [FFMPEG, "-i", concat_temp]
    probe_res = subprocess.run(probe_cmd, stderr=subprocess.PIPE, text=True)
    duration_secs = 46.0
    for line in probe_res.stderr.splitlines():
        if "Duration:" in line:
            parts = line.split("Duration:")[1].split(",")[0].strip().split(":")
            duration_secs = float(parts[0])*3600 + float(parts[1])*60 + float(parts[2])
            break
            
    print(f"Total trailer duration: {duration_secs:.2f}s")
    fade_start = max(0.0, duration_secs - 1.2)
    
    audio_filter = (
        f"[0:a]volume=1.0[sfx];"
        f"[1:a]volume=0.35,atrim=0:{duration_secs}[music];"
        f"[sfx][music]amix=inputs=2:duration=first:dropout_transition=2[mixed];"
        f"[mixed]afade=t=out:st={fade_start}:d=1.2[outa]"
    )
    
    cmd_final = [
        FFMPEG, "-y",
        "-i", concat_temp,
        "-i", SOUNDTRACK,
        "-filter_complex", audio_filter,
        "-map", "0:v",
        "-map", "[outa]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "256k",
        "-shortest",
        output_mp4
    ]
    run_cmd(cmd_final, "Final audio mix & packaging")
    print(f"Successfully created: {output_mp4} (Size: {os.path.getsize(output_mp4)/1024/1024:.2f} MB)")

def main():
    endcard_16x9 = os.path.join(OUTPUT_DIR, "trailer_endcard_16x9.jpg")
    endcard_mobi = os.path.join(OUTPUT_DIR, "trailer_endcard_mobile.jpg")
    
    # 1. Native Mobile Ultra-Wide Trailer (Pixel 7 Pro 2340x1080 - 19.5:9 Edge-to-Edge)
    out_pixel7 = os.path.join(OUTPUT_DIR, "AlienBaseDefense-Official-Trailer-Pixel7Pro.mp4")
    build_trailer(2340, 1080, endcard_mobi, out_pixel7, is_letterbox=False)
    
    # 2. Standard 16:9 1080p Widescreen Master (1920x1080 - YouTube / Store Landscape)
    out_1080p = os.path.join(OUTPUT_DIR, "AlienBaseDefense-Official-Trailer-1080p.mp4")
    build_trailer(1920, 1080, endcard_16x9, out_1080p, is_letterbox=True)
    
    print("\n==========================================")
    print("ALL TRAILERS BUILT SUCCESSFULLY IN G:\\AI Games\\Backup\\videos")
    print(f"1) Pixel 7 Pro (2340x1080 60fps): {out_pixel7}")
    print(f"2) Standard 16:9 (1920x1080 60fps): {out_1080p}")
    print("==========================================")

if __name__ == "__main__":
    main()
