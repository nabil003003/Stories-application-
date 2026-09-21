import os
import secrets
import socket
import time
from pathlib import Path


def find_free_port() -> int:
    """Bind to port 0 to obtain an available ephemeral port from the OS."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


class Settings:
    PROJECT_NAME: str = "StoryForge Studio"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    START_TIME: float = time.time()

    HOST: str = os.getenv("STORYFORGE_HOST", "127.0.0.1")

    # If STORYFORGE_PORT is 0 or unset, allocate free port
    _raw_port = int(os.getenv("STORYFORGE_PORT", "8000"))
    PORT: int = find_free_port() if _raw_port == 0 else _raw_port

    SESSION_TOKEN: str = os.getenv("STORYFORGE_TOKEN", "auto-session-token")

    # Path to runtime lockfile
    RUNTIME_FILE: Path = Path(os.getenv("STORYFORGE_RUNTIME_FILE", "runtime.json"))


settings = Settings()
