import json
import os
import subprocess
import sys
import time
import urllib.request

def main() -> None:
    python_exe = sys.executable
    print(f"Launching sidecar with {python_exe}...")

    runtime_file = os.path.abspath("apps/backend/runtime.json")
    if os.path.exists(runtime_file):
        os.remove(runtime_file)

    proc = subprocess.Popen(
        [python_exe, "-m", "app.main"],
        cwd="apps/backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        found = False
        runtime_info = None
        for _ in range(30):
            if os.path.exists(runtime_file):
                try:
                    with open(runtime_file, "r") as f:
                        content = f.read().strip()
                        if content:
                            runtime_info = json.loads(content)
                            found = True
                            break
                except Exception:
                    pass
            time.sleep(0.2)

        if not found or runtime_info is None:
            print("ERROR: runtime.json was not created within timeout")
            stdout, stderr = proc.communicate(timeout=2)
            print("Sidecar STDOUT:", stdout)
            print("Sidecar STDERR:", stderr)
            sys.exit(1)

        print("Fresh runtime info found:", runtime_info)
        port = runtime_info["port"]
        token = runtime_info["token"]

        # Call GET /api/health
        url = f"http://127.0.0.1:{port}/api/health"
        print(f"Querying {url} with Bearer token...")
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print("\n=======================================================")
            print("SUCCESS! Live health response received from sidecar:")
            print("=======================================================")
            print(json.dumps(data, indent=2))
            print("=======================================================\n")
    finally:
        print("Stopping sidecar process...")
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
        print("Sidecar process stopped.")

if __name__ == "__main__":
    main()
