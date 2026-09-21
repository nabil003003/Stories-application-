import struct
import zlib

def clamp(val: float) -> int:
    return max(0, min(255, int(val)))

def create_png(width: int, height: int) -> bytes:
    raw_data = bytearray()
    cx, cy = width / 2.0, height / 2.0
    for y in range(height):
        raw_data.append(0)  # Filter type 0 (None)
        dy = (y - cy) / cy
        for x in range(width):
            dx = (x - cx) / cx

            # Rounded squircle icon background
            if abs(dx) ** 4 + abs(dy) ** 4 < 0.75:
                # Blue/indigo gradient
                r = clamp(20 + 20 * (1.0 - dy))
                g = clamp(60 + 40 * (1.0 - dy))
                b = clamp(160 + 40 * (1.0 - dy))
                a = 255

                # Soundwave bars
                bar_idx = int((x - 130) / 45)
                if 0 <= bar_idx < 6 and 130 <= x <= 385:
                    bar_cx = 130 + bar_idx * 45 + 18
                    if abs(x - bar_cx) < 14:
                        heights = [60, 130, 200, 160, 110, 60]
                        if abs(y - cy) < heights[bar_idx]:
                            r, g, b = 250, 250, 255
            else:
                r, g, b, a = 0, 0, 0, 0

            raw_data.extend([r, g, b, a])

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    header = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(bytes(raw_data), 9))
    iend = chunk(b"IEND", b"")
    return header + ihdr + idat + iend

if __name__ == "__main__":
    with open("app-icon.png", "wb") as f:
        f.write(create_png(512, 512))
    print("app-icon.png generated successfully")
