import json
import urllib.request

def main():
    with open("apps/backend/runtime.json", "r") as f:
        info = json.load(f)

    port = info["port"]
    token = info["token"]

    # Test GET /api/tts/styles
    url_styles = f"http://127.0.0.1:{port}/api/tts/styles"
    req_styles = urllib.request.Request(
        url_styles,
        headers={"Authorization": f"Bearer {token}"},
    )

    try:
        with urllib.request.urlopen(req_styles) as resp:
            styles = json.loads(resp.read().decode("utf-8"))
            print(f"SUCCESS: Received {len(styles)} styles from live backend!")
            print("First 2 styles:", styles[:2])
    except Exception as e:
        print("Styles request error:", e)

    # Test POST /api/tts/synthesize with voice and style
    url_synth = f"http://127.0.0.1:{port}/api/tts/synthesize"
    req_synth = urllib.request.Request(
        url_synth,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        data=json.dumps({
            "text": "احذروا! هذا اختبار لصوت جديد وأسلوب مشوق.",
            "language": "ar",
            "voice": "ar-EG-ShakirNeural",
            "style": "Suspense",
        }).encode("utf-8"),
    )

    try:
        with urllib.request.urlopen(req_synth) as resp:
            data = resp.read()
            print(f"SUCCESS: Synthesized {len(data)} bytes with Shakir Egyptian in Suspense style!")
    except Exception as e:
        print("Synthesis request error:", e)

if __name__ == "__main__":
    main()
