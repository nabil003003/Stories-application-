import sys
from pathlib import Path
sys.path.insert(0, str(Path("apps/backend").resolve()))

from app.api.tts import AVAILABLE_VOICES, AVAILABLE_STYLES, compute_acoustic_params

print(f"{len(AVAILABLE_VOICES)} voices and {len(AVAILABLE_STYLES)} styles loaded successfully!")
print("Urgent test params:", compute_acoustic_params("Urgent", "+10%", "-2Hz", None))
print("Whisper test params:", compute_acoustic_params("Whisper", None, None, None))
