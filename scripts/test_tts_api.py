import json
import urllib.request

def main():
    with open("apps/backend/runtime.json", "r") as f:
        info = json.load(f)

    port = info["port"]
    token = info["token"]

    url = f"http://127.0.0.1:{port}/api/tts/synthesize"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        data=json.dumps({
            "text": "احذروا! هناك نقوش محفورة باللغة الهيروغليفية القديمة تحذر من فتح هذا التابوت.",
            "language": "ar",
        }).encode("utf-8"),
    )

    with urllib.request.urlopen(req) as resp:
        data = resp.read()
        print(f"SUCCESS: Received {len(data)} bytes of Arabic neural speech audio from sidecar!")

if __name__ == "__main__":
    main()
