import math
import struct
import wave
from pathlib import Path

OUTPUT_DIR = Path("apps/desktop/public/audio")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 44100
DURATION = 12.0  # 12 seconds seamless loop


def generate_wav(filename: str, samples_left: list[float], samples_right: list[float]):
    num_samples = len(samples_left)
    filepath = OUTPUT_DIR / filename
    with wave.open(str(filepath), "w") as wav:
        wav.setnchannels(2)  # Stereo
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(SAMPLE_RATE)

        # Interleave stereo and pack as signed 16-bit PCM
        frames = bytearray()
        for i in range(num_samples):
            # Clip between -1.0 and 1.0
            l = max(-1.0, min(1.0, samples_left[i]))
            r = max(-1.0, min(1.0, samples_right[i]))
            int_l = int(l * 32767.0)
            int_r = int(r * 32767.0)
            frames.extend(struct.pack("<hh", int_l, int_r))

        wav.writeframes(frames)
    print(f"Generated {filepath} ({len(frames)} bytes, {DURATION}s stereo)")


def build_desert_mystery():
    """Ancient Desert Mystery: D minor / Hijaz maqam drone, oud harmonics, gentle wind drift."""
    total_samples = int(SAMPLE_RATE * DURATION)
    left = [0.0] * total_samples
    right = [0.0] * total_samples

    # Frequencies: D2 (73.4), A2 (110), D3 (146.8), Eb3 (155.6 - Hijaz), F#3 (185.0), A3 (220.0)
    drone_freqs = [73.42, 110.0, 146.83, 220.0, 293.66]

    # Pluck simulation points (oud / kanun notes)
    plucks = [
        (0.0, 146.83, 0.4),   # D3
        (1.5, 155.56, 0.35),  # Eb3 (Hijaz color)
        (3.0, 185.00, 0.35),  # F#3
        (4.5, 220.00, 0.4),   # A3
        (6.0, 293.66, 0.35),  # D4
        (7.5, 220.00, 0.3),   # A3
        (9.0, 185.00, 0.35),  # F#3
        (10.5, 155.56, 0.3),  # Eb3
    ]

    import random
    rng = random.Random(42)

    for i in range(total_samples):
        t = i / SAMPLE_RATE

        # 1. Warm sub-drone pad with slow vibrato / tremolo
        pad = 0.0
        for idx, f in enumerate(drone_freqs):
            detune = 1.0 + 0.002 * math.sin(0.4 * t + idx)
            pad += (0.12 / (idx + 1)) * math.sin(2 * math.pi * f * detune * t)

        # 2. Gentle desert wind atmosphere (filtered noise)
        noise = (rng.random() * 2 - 1) * 0.04 * (1.0 + 0.4 * math.sin(0.2 * t))

        # 3. Oud acoustic plucks with exponential decay
        pluck_sound = 0.0
        for p_time, p_freq, p_amp in plucks:
            dt = t - p_time
            if dt >= 0:
                # Pluck envelope: sharp attack, decay
                env = math.exp(-dt * 2.2) * (1.0 - math.exp(-dt * 40.0))
                if env > 0.001:
                    pluck_sound += p_amp * env * (
                        math.sin(2 * math.pi * p_freq * dt)
                        + 0.5 * math.sin(2 * math.pi * p_freq * 2 * dt)
                        + 0.25 * math.sin(2 * math.pi * p_freq * 3 * dt)
                    )

        # Stereo spread
        left[i] = pad * 0.9 + noise * 0.8 + pluck_sound * 0.85
        right[i] = pad * 0.85 + noise * 1.1 + pluck_sound * 0.95

    generate_wav("desert_mystery.wav", left, right)


def build_calm_rain():
    """Calm Rain: Soothing pink noise rain bed, soft pentatonic ambient Rhodes chords."""
    total_samples = int(SAMPLE_RATE * DURATION)
    left = [0.0] * total_samples
    right = [0.0] * total_samples

    # Pentatonic chords: F minor (F, Ab, C, Eb, G)
    chords = [
        # (time, freqs)
        (0.0, [174.61, 207.65, 261.63, 311.13]),  # Fm7
        (6.0, [155.56, 196.00, 233.08, 311.13]),  # Ebadd9
    ]

    import random
    rng = random.Random(1337)

    # Simple lowpass pink noise filter state
    b0_l, b1_l, b2_l = 0.0, 0.0, 0.0
    b0_r, b1_r, b2_r = 0.0, 0.0, 0.0

    for i in range(total_samples):
        t = i / SAMPLE_RATE

        # Pink noise for rain
        white_l = (rng.random() * 2 - 1)
        white_r = (rng.random() * 2 - 1)

        b0_l = 0.99765 * b0_l + white_l * 0.0990460
        b1_l = 0.96300 * b1_l + white_l * 0.2965164
        b2_l = 0.57000 * b2_l + white_l * 1.0526913
        rain_l = (b0_l + b1_l + b2_l + white_l * 0.1848) * 0.04

        b0_r = 0.99765 * b0_r + white_r * 0.0990460
        b1_r = 0.96300 * b1_r + white_r * 0.2965164
        b2_r = 0.57000 * b2_r + white_r * 1.0526913
        rain_r = (b0_r + b1_r + b2_r + white_r * 0.1848) * 0.04

        # Electric piano chords
        chord_val = 0.0
        for c_time, freqs in chords:
            dt = (t - c_time) % 12.0
            if dt >= 0 and dt < 6.0:
                env = math.exp(-dt * 0.5) * (1.0 - math.exp(-dt * 15.0))
                for f in freqs:
                    chord_val += 0.08 * env * (
                        math.sin(2 * math.pi * f * dt)
                        + 0.3 * math.sin(2 * math.pi * f * 2 * dt)
                    )

        left[i] = rain_l + chord_val * 0.9
        right[i] = rain_r + chord_val * 0.85

    generate_wav("calm_rain.wav", left, right)


def build_tomb_drone():
    """Subterranean Chamber: Deep cinematic 40Hz-80Hz sub-bass, resonant dark drones."""
    total_samples = int(SAMPLE_RATE * DURATION)
    left = [0.0] * total_samples
    right = [0.0] * total_samples

    for i in range(total_samples):
        t = i / SAMPLE_RATE

        # Deep sub-bass (C1 = 32.7Hz, G1 = 49Hz, C2 = 65.4Hz)
        sub = 0.25 * math.sin(2 * math.pi * 32.70 * t)
        sub += 0.18 * math.sin(2 * math.pi * 49.00 * t)
        sub += 0.12 * math.sin(2 * math.pi * 65.41 * (1.0 + 0.003 * math.sin(0.3 * t)) * t)

        # Ominous resonant harmonic
        res_l = 0.08 * math.sin(2 * math.pi * 130.81 * t + 0.5 * math.sin(0.5 * t))
        res_r = 0.08 * math.sin(2 * math.pi * 131.50 * t + 0.5 * math.cos(0.5 * t))

        # Tension pulse every 2 seconds
        pulse_dt = t % 2.0
        pulse_env = math.exp(-pulse_dt * 3.5)
        pulse = 0.15 * pulse_env * math.sin(2 * math.pi * 55.0 * pulse_dt)

        left[i] = sub * 0.9 + res_l + pulse * 0.8
        right[i] = sub * 0.9 + res_r + pulse * 0.85

    generate_wav("tomb_drone.wav", left, right)


def build_epic_tension():
    """Epic Tension: Cinematic driving pulse, dramatic cellos and brass swelling."""
    total_samples = int(SAMPLE_RATE * DURATION)
    left = [0.0] * total_samples
    right = [0.0] * total_samples

    for i in range(total_samples):
        t = i / SAMPLE_RATE

        # Heartbeat 75 BPM -> 0.8s interval
        beat_t = t % 0.8
        kick = 0.28 * math.exp(-beat_t * 8.0) * math.sin(2 * math.pi * (50.0 - 20.0 * beat_t) * beat_t)

        # Minor ostinato strings: C3, Eb3, G3, Ab3 (every 0.2s = 16th note)
        step = int((t % 0.8) / 0.2)
        step_freqs = [130.81, 155.56, 196.00, 207.65]
        freq = step_freqs[step]
        sub_t = t % 0.2
        ostinato = 0.12 * math.exp(-sub_t * 6.0) * (
            math.sin(2 * math.pi * freq * sub_t)
            + 0.5 * math.sin(2 * math.pi * freq * 2 * sub_t)
        )

        # Swelling brass pad
        swell = 0.14 * (0.5 + 0.5 * math.sin(2 * math.pi * (t / 6.0))) * (
            math.sin(2 * math.pi * 65.41 * t) + 0.4 * math.sin(2 * math.pi * 98.0 * t)
        )

        left[i] = kick + ostinato * 0.95 + swell * 0.85
        right[i] = kick + ostinato * 0.85 + swell * 0.95

    generate_wav("epic_tension.wav", left, right)


if __name__ == "__main__":
    build_desert_mystery()
    build_calm_rain()
    build_tomb_drone()
    build_epic_tension()
    print("All 4 cinematic music soundtracks generated successfully!")
