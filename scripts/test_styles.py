import asyncio
import edge_tts

STYLES = {
    "Cinematic": {"rate": "-8%", "pitch": "-5Hz", "volume": "+5%"},
    "Suspense": {"rate": "-14%", "pitch": "-8Hz", "volume": "-10%"},
    "Urgent": {"rate": "+16%", "pitch": "+6Hz", "volume": "+15%"},
    "Whisper": {"rate": "-18%", "pitch": "-6Hz", "volume": "-30%"},
    "Documentary": {"rate": "-2%", "pitch": "+0Hz", "volume": "+5%"},
    "Storybook": {"rate": "-5%", "pitch": "+5Hz", "volume": "+0%"},
    "Emotional": {"rate": "-12%", "pitch": "-4Hz", "volume": "-15%"},
}

async def test():
    for name, s in STYLES.items():
        c = edge_tts.Communicate(
            "هذا اختبار لأسلوب القراءة السينمائي في الاستوديو.",
            "ar-SA-HamedNeural",
            rate=s["rate"],
            pitch=s["pitch"],
            volume=s["volume"],
        )
        data = bytearray()
        async for chunk in c.stream():
            if chunk["type"] == "audio":
                data.extend(chunk["data"])
        print(f"Style {name}: {len(data)} bytes generated successfully!")

asyncio.run(test())
