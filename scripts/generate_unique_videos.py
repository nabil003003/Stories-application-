import os
import sys
import time
import subprocess
from pathlib import Path

# Resolve project root and virtual environment ffmpeg
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
STORAGE_VIDEOS = WORKSPACE_ROOT / "apps" / "backend" / "storage" / "media" / "videos"
STORAGE_THUMBS = WORKSPACE_ROOT / "apps" / "backend" / "storage" / "media" / "thumbnails"

STORAGE_VIDEOS.mkdir(parents=True, exist_ok=True)
STORAGE_THUMBS.mkdir(parents=True, exist_ok=True)

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"

print(f"[Generator] Using ffmpeg binary: {FFMPEG_EXE}")
print(f"[Generator] Target video dir: {STORAGE_VIDEOS}")
print(f"[Generator] Target thumbnail dir: {STORAGE_THUMBS}")

# Definition of 12 themes with 10 unique visual palettes & motions each (120 total)
THEMES = {
    "desert_epic": {
        "prefix": "vid-desert",
        "palettes": [
            ("0xd97706", "0x78350f", "spiral", 0.02, 10, "Golden Dunes Drift"),
            ("0xb45309", "0x451a03", "linear", 0.03, 14, "Sahara Wind Storm"),
            ("0x9a3412", "0x292524", "radial", 0.015, 12, "Red Sand Canyon Twilight"),
            ("0x0d9488", "0xd97706", "linear", 0.025, 8, "Desert Oasis Mirage"),
            ("0xc2410c", "0x7c2d12", "spiral", 0.018, 11, "Ancient Camel Caravan Horizon"),
            ("0xf59e0b", "0xb45309", "radial", 0.022, 9, "Sun Rising Over Arid Ridge"),
            ("0xeab308", "0x854d0e", "linear", 0.035, 13, "Sand Ripple Wind Waves"),
            ("0xd97706", "0x1c1917", "spiral", 0.016, 10, "Golden Hour Long Shadows"),
            ("0xca8a04", "0x713f12", "radial", 0.02, 12, "Endless Desert Horizon"),
            ("0x1e1b4b", "0xd97706", "linear", 0.012, 15, "Starlight Over Sand Dunes"),
        ]
    },
    "night_stars": {
        "prefix": "vid-night",
        "palettes": [
            ("0x0f172a", "0x38bdf8", "spiral", 0.025, 28, "Deep Cosmos Milky Way"),
            ("0x1e1b4b", "0x818cf8", "radial", 0.018, 25, "Starry Sky Clouds Drift"),
            ("0x022c22", "0x34d399", "linear", 0.03, 20, "Aurora Borealis Curtains"),
            ("0x18181b", "0xc084fc", "radial", 0.015, 22, "Crescent Moon Mystical Fog"),
            ("0x0c4a6e", "0x38bdf8", "spiral", 0.022, 24, "Starlight Mountain Lake"),
            ("0x2e1065", "0xa855f7", "spiral", 0.035, 26, "Celestial Galaxy Spiral"),
            ("0x082f49", "0x06b6d4", "linear", 0.02, 25, "Deep Blue Space Nebula"),
            ("0x022c22", "0xa7f3d0", "radial", 0.028, 22, "Shooting Stars Forest"),
            ("0x09090b", "0x64748b", "linear", 0.016, 18, "Mystic Dark Sky Inversion"),
            ("0x172554", "0x93c5fd", "spiral", 0.03, 27, "Midnight Constellations Sky"),
        ]
    },
    "ocean_waves": {
        "prefix": "vid-ocean",
        "palettes": [
            ("0x0369a1", "0x082f49", "linear", 0.035, 12, "Crashing Tempest Waves"),
            ("0x0284c7", "0x075985", "spiral", 0.022, 10, "Deep Blue Ocean Swell"),
            ("0xd97706", "0x0284c7", "radial", 0.025, 11, "Sunset Golden Surf"),
            ("0x065f46", "0x0f766e", "linear", 0.032, 14, "Stormy Emerald Sea Surge"),
            ("0x334155", "0x0e7490", "radial", 0.015, 15, "Ghost Ship Horizon Fog"),
            ("0x0284c7", "0x0369a1", "spiral", 0.028, 9, "Open Sea Ripple Currents"),
            ("0x09090b", "0x0891b2", "linear", 0.03, 13, "Volcanic Shore Wave Foam"),
            ("0x4338ca", "0x0284c7", "radial", 0.018, 10, "Oceanic Calm Evening Tide"),
            ("0x1e293b", "0x06b6d4", "linear", 0.026, 16, "Coastal Cliffs Sea Spray"),
            ("0x0c4a6e", "0x38bdf8", "spiral", 0.024, 12, "Deep Underwater Sun Rays"),
        ]
    },
    "storm_dramatic": {
        "prefix": "vid-storm",
        "palettes": [
            ("0x1e1b4b", "0x475569", "linear", 0.04, 20, "Dark Thunderstorm Rolling"),
            ("0x09090b", "0xa855f7", "radial", 0.05, 24, "Violent Lightning Flash"),
            ("0x0f172a", "0x0284c7", "spiral", 0.035, 22, "Cyclone Cloud Wall"),
            ("0x334155", "0x1e293b", "linear", 0.045, 18, "Gale Force Winds Plain"),
            ("0x18181b", "0x581c87", "radial", 0.03, 25, "Ominous Dark Squall"),
            ("0x312e81", "0x38bdf8", "spiral", 0.042, 26, "Turbulent Lightning Clouds"),
            ("0x1e293b", "0x0369a1", "linear", 0.05, 19, "Heavy Rain Gale Torrent"),
            ("0x09090b", "0x818cf8", "radial", 0.038, 23, "Storm Clouds Distant Lightning"),
            ("0x020617", "0x475569", "spiral", 0.032, 21, "Howling Tempest Darkness"),
            ("0x450a0a", "0x1e1b4b", "linear", 0.048, 28, "Red Lightning Supercell"),
        ]
    },
    "futuristic_city": {
        "prefix": "vid-city",
        "palettes": [
            ("0x831843", "0x06b6d4", "spiral", 0.04, 16, "Cyberpunk Neon Grid"),
            ("0x581c87", "0xf59e0b", "linear", 0.035, 14, "Tokyo Night Neon Skyline"),
            ("0x0284c7", "0xec4899", "radial", 0.045, 18, "Futuristic Light Trails"),
            ("0x312e81", "0x10b981", "linear", 0.03, 15, "Matrix Cyber Metropolis"),
            ("0x09090b", "0xa855f7", "spiral", 0.038, 20, "Megacity Tower Beams"),
            ("0x9d174d", "0x3b82f6", "radial", 0.042, 17, "Synthwave City Sunset"),
            ("0x042f2e", "0x06b6d4", "linear", 0.034, 16, "Cyberpunk Rain Reflections"),
            ("0x701a75", "0x0284c7", "spiral", 0.048, 19, "Flying Vehicles Skyway"),
            ("0x18181b", "0xef4444", "linear", 0.036, 21, "Underground Neon Alley"),
            ("0x1e1b4b", "0x38bdf8", "radial", 0.04, 15, "Hyperloop Light Speed"),
        ]
    },
    "mystic_forest": {
        "prefix": "vid-forest",
        "palettes": [
            ("0x022c22", "0x10b981", "linear", 0.022, 12, "Sunlit Canopy Emerald"),
            ("0x064e3b", "0xd97706", "radial", 0.018, 14, "Golden Hour Redwood"),
            ("0x042f2e", "0x059669", "spiral", 0.025, 11, "Mystic Fog Woodland"),
            ("0x065f46", "0x84cc16", "linear", 0.02, 10, "Bamboo Grove Morning"),
            ("0x14532d", "0x38bdf8", "radial", 0.026, 13, "Rainforest Waterfall Mist"),
            ("0x1c1917", "0x047857", "spiral", 0.016, 15, "Deep Enchanted Forest"),
            ("0x78350f", "0x059669", "linear", 0.024, 12, "Autumn Leaves Canopy"),
            ("0x022c22", "0x6ee7b7", "radial", 0.03, 11, "Sacred Grove Sunbeams"),
            ("0x0f172a", "0x10b981", "spiral", 0.019, 14, "Bioluminescent Night Woods"),
            ("0x064e3b", "0x22c55e", "linear", 0.028, 10, "Spring Blossom Meadow"),
        ]
    },
    "fire_embers": {
        "prefix": "vid-fire",
        "palettes": [
            ("0x7c2d12", "0xf97316", "spiral", 0.035, 32, "Blazing Inferno Flames"),
            ("0x450a0a", "0xeab308", "radial", 0.04, 35, "Campfire Rising Sparks"),
            ("0x1c1917", "0xdc2626", "linear", 0.028, 30, "Lava Magma Cracks"),
            ("0x991b1b", "0xfbbf24", "spiral", 0.045, 38, "Phoenix Flame Surge"),
            ("0x292524", "0xe11d48", "radial", 0.032, 28, "Glowing Coal Embers"),
            ("0x78350f", "0xf97316", "linear", 0.036, 33, "Torchlight Dungeon Fire"),
            ("0x450a0a", "0xf59e0b", "spiral", 0.042, 36, "Wildfire Ridge Smoke"),
            ("0x09090b", "0xf97316", "radial", 0.05, 40, "Floating Fire Embers Night"),
            ("0x831843", "0xf97316", "linear", 0.034, 31, "Blacksmith Forge Heat"),
            ("0x7f1d1d", "0xfef08a", "spiral", 0.048, 37, "Volcanic Eruption Glow"),
        ]
    },
    "rain_window": {
        "prefix": "vid-rain",
        "palettes": [
            ("0x1e293b", "0x64748b", "linear", 0.04, 15, "Steely Rain Streaks Glass"),
            ("0x0f172a", "0x0284c7", "radial", 0.035, 18, "Evening Street Rain Reflections"),
            ("0x334155", "0x94a3b8", "linear", 0.045, 14, "Overcast Heavy Downpour"),
            ("0x1e1b4b", "0x38bdf8", "spiral", 0.03, 17, "Night City Wet Puddles"),
            ("0x18181b", "0x0ea5e9", "linear", 0.038, 16, "Thunder Storm Window Drops"),
            ("0x0f766e", "0x64748b", "radial", 0.025, 13, "Tropical Drizzle Leaves"),
            ("0x312e81", "0x93c5fd", "spiral", 0.032, 19, "Midnight Rain Horizon"),
            ("0x1c1917", "0x60a5fa", "linear", 0.042, 15, "Gloomy Winter Rain"),
            ("0x0f172a", "0xd97706", "radial", 0.028, 14, "Raindrops & Streetlamp Warmth"),
            ("0x374151", "0x38bdf8", "linear", 0.046, 18, "Typhoon Gale Rain Sweeps"),
        ]
    },
    "ancient_temple": {
        "prefix": "vid-temple",
        "palettes": [
            ("0x78350f", "0xd97706", "radial", 0.02, 14, "Sandstone Temple Pillars"),
            ("0x451a03", "0xf59e0b", "spiral", 0.024, 16, "Pyramid Tomb Torchlight"),
            ("0x1c1917", "0x92400e", "linear", 0.018, 15, "Ancient Ruin Stone Hall"),
            ("0x1e1b4b", "0xd97706", "radial", 0.022, 13, "Pharaoh Gold Relics"),
            ("0x042f2e", "0xb45309", "spiral", 0.026, 17, "Lost Jungle Temple Ruins"),
            ("0x292524", "0xca8a04", "linear", 0.016, 12, "Desert Crypt Entrance"),
            ("0x701a75", "0xd97706", "radial", 0.028, 18, "Mystical Altar Fire"),
            ("0x09090b", "0xb45309", "spiral", 0.02, 15, "Sunken Stone Monoliths"),
            ("0x3b0764", "0xf59e0b", "linear", 0.025, 16, "Arcane Hieroglyph Portal"),
            ("0x451a03", "0x78350f", "radial", 0.015, 14, "Ancient Castle Fortress"),
        ]
    },
    "noir_crime": {
        "prefix": "vid-noir",
        "palettes": [
            ("0x09090b", "0x71717a", "radial", 0.025, 20, "Moody Streetlamp Cone"),
            ("0x18181b", "0x27272a", "linear", 0.03, 18, "Venetian Blind Slits"),
            ("0x020617", "0xd97706", "radial", 0.02, 22, "Rainy Noir Alley Cigarette"),
            ("0x111827", "0x4b5563", "spiral", 0.028, 24, "Detective Office Smoke"),
            ("0x09090b", "0x0284c7", "linear", 0.034, 19, "Crime Scene Fog Horizon"),
            ("0x18181b", "0xa1a1aa", "radial", 0.022, 17, "Interrogation Spotlight"),
            ("0x0f172a", "0x64748b", "spiral", 0.026, 21, "Waterfront Pier Shadows"),
            ("0x09090b", "0xef4444", "linear", 0.032, 23, "Neon Hotel Noir Sign"),
            ("0x1c1917", "0x78716c", "radial", 0.018, 16, "Vintage Trenchcoat Alley"),
            ("0x030712", "0x374151", "spiral", 0.036, 25, "Midnight Mystery Chase"),
        ]
    },
    "peaceful_dawn": {
        "prefix": "vid-dawn",
        "palettes": [
            ("0x831843", "0xfbbf24", "linear", 0.02, 8, "Pastel Sunrise Horizon"),
            ("0x4c0519", "0xf43f5e", "radial", 0.022, 9, "Rose Gold Morning Sky"),
            ("0x1e1b4b", "0xfb923c", "linear", 0.018, 10, "First Light Over Mountains"),
            ("0x064e3b", "0xfef08a", "radial", 0.025, 7, "Meadow Mist Morning Sun"),
            ("0x312e81", "0xf472b6", "spiral", 0.024, 11, "Lavender Clouds Dawn"),
            ("0x0c4a6e", "0xfbbf24", "linear", 0.02, 9, "Calm Lake Sunrise Glow"),
            ("0x701a75", "0xfdba74", "radial", 0.026, 10, "Spring Floral Dawn"),
            ("0x1c1917", "0xfde047", "spiral", 0.016, 8, "Serene Hillside Sunbeam"),
            ("0x14532d", "0xf43f5e", "linear", 0.028, 12, "Woodland Sunrise Rays"),
            ("0x0f172a", "0xfb923c", "radial", 0.022, 9, "Ocean Shore Golden Morning"),
        ]
    },
    "dramatic_dialogue": {
        "prefix": "vid-dialogue",
        "palettes": [
            ("0x4c0519", "0x881337", "radial", 0.024, 15, "Theatrical Ruby Spotlight"),
            ("0x1c1917", "0xd97706", "spiral", 0.03, 18, "Intense Confrontation Flare"),
            ("0x0284c7", "0x4c0519", "linear", 0.026, 14, "Emotional Cold vs Warm"),
            ("0x312e81", "0xbe123c", "radial", 0.028, 16, "Heartbreak Twilight Violet"),
            ("0x022c22", "0x991b1b", "spiral", 0.032, 20, "Tense Suspense Shadow"),
            ("0x7f1d1d", "0x1e1b4b", "linear", 0.035, 17, "Betrayal Crimson Swirl"),
            ("0x78350f", "0x09090b", "radial", 0.02, 13, "Aristocratic Dramatic Gold"),
            ("0x09090b", "0xfafafa", "spiral", 0.04, 22, "Stark Contrast High Drama"),
            ("0x3b0764", "0xdb2777", "linear", 0.028, 15, "Psychological Tension Magenta"),
            ("0x1e293b", "0xfbbf24", "radial", 0.022, 14, "Final Revelation Beam"),
        ]
    }
}

def generate_video(vid_id: str, c0: str, c1: str, grad_type: str, speed: float, noise: int):
    target_mp4 = STORAGE_VIDEOS / f"{vid_id}.mp4"
    target_thumb = STORAGE_THUMBS / f"{vid_id}.jpg"

    filter_chain = (
        f"gradients=s=540x960:c0={c0}:c1={c1}:speed={speed}:type={grad_type},"
        f"noise=alls={noise}:allf=t+u,"
        f"vignette=PI/4,"
        f"eq=contrast=1.15:saturation=1.2"
    )

    cmd = [
        FFMPEG_EXE, "-y",
        "-f", "lavfi",
        "-i", filter_chain,
        "-t", "4",
        "-r", "24",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "ultrafast",
        "-tune", "animation",
        str(target_mp4)
    ]

    res = subprocess.run(cmd, capture_output=True)
    if res.returncode != 0:
        print(f"[Error] {vid_id} generation failed: {res.stderr[:200]}")
        return False

    # Extract clean thumbnail from 1.5s
    thumb_cmd = [
        FFMPEG_EXE, "-y",
        "-ss", "00:00:01.5",
        "-i", str(target_mp4),
        "-vframes", "1",
        "-q:v", "2",
        str(target_thumb)
    ]
    subprocess.run(thumb_cmd, capture_output=True)
    return True

def main():
    total = 0
    success = 0
    t0 = time.time()

    print("[Generator] Starting generation of 120 unique procedural motion loops...")

    for theme_key, theme_data in THEMES.items():
        prefix = theme_data["prefix"]
        palettes = theme_data["palettes"]

        for i, (c0, c1, grad_type, speed, noise, title) in enumerate(palettes):
            num_str = f"{i+1:02d}"
            vid_id = f"{prefix}-{num_str}"
            total += 1

            ok = generate_video(vid_id, c0, c1, grad_type, speed, noise)
            if ok:
                success += 1
                print(f"  [{success}/{120}] Generated {vid_id}: {title}")

    elapsed = round(time.time() - t0, 2)
    print(f"\n[Generator] COMPLETED! {success}/{total} videos and thumbnails generated in {elapsed}s.")

if __name__ == "__main__":
    main()
