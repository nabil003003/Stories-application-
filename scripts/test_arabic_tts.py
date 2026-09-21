import asyncio
import edge_tts

async def main():
    text = "احذروا! هناك نقوش محفورة باللغة الهيروغليفية القديمة تحذر من فتح هذا التابوت."
    voice = "ar-SA-HamedNeural"
    print(f"Synthesizing Arabic audio with {voice}...")
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save("test_ar.mp3")
    print("Arabic audio successfully synthesized to test_ar.mp3!")

if __name__ == "__main__":
    asyncio.run(main())
