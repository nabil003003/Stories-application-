from typing import Annotated

import edge_tts
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel

from app.core.security import verify_bearer_token

router = APIRouter(prefix="/tts", tags=["TTS"])

# Comprehensive Catalogue of Studio-Grade Neural Voices
AVAILABLE_VOICES: list[dict[str, str]] = [
    # Arabic Voices (Saudi Arabia, Egypt, UAE, Morocco, Algeria, Tunisia, Lebanon, Syria, Jordan, Iraq)
    {"id": "ar-SA-HamedNeural", "name": "Hamed (حامد)", "lang": "ar", "gender": "Male", "style": "Epic & Deep MSA Narrator", "flag": "SA", "region": "Saudi Arabia"},
    {"id": "ar-SA-ZariyahNeural", "name": "Zariyah (زارية)", "lang": "ar", "gender": "Female", "style": "Dramatic & Regal Queen", "flag": "SA", "region": "Saudi Arabia"},
    {"id": "ar-EG-ShakirNeural", "name": "Shakir (شاكر)", "lang": "ar", "gender": "Male", "style": "Warm Narrative Storyteller", "flag": "EG", "region": "Egypt"},
    {"id": "ar-EG-SalmaNeural", "name": "Salma (سلمى)", "lang": "ar", "gender": "Female", "style": "Expressive & Lively Egyptian", "flag": "EG", "region": "Egypt"},
    {"id": "ar-AE-HamdanNeural", "name": "Hamdan (حمدان)", "lang": "ar", "gender": "Male", "style": "Calm & Authoritative Gulf", "flag": "AE", "region": "UAE"},
    {"id": "ar-AE-FatimaNeural", "name": "Fatima (فاطمة)", "lang": "ar", "gender": "Female", "style": "Eloquent & Melodic Gulf", "flag": "AE", "region": "UAE"},
    {"id": "ar-MA-JamalNeural", "name": "Jamal (جمال)", "lang": "ar", "gender": "Male", "style": "Historical Maghrebi Storyteller", "flag": "MA", "region": "Morocco"},
    {"id": "ar-MA-MounaNeural", "name": "Mouna (منى)", "lang": "ar", "gender": "Female", "style": "Soft & Melodic Storyteller", "flag": "MA", "region": "Morocco"},
    {"id": "ar-DZ-IsmaelNeural", "name": "Ismael (إسماعيل)", "lang": "ar", "gender": "Male", "style": "Intense & Noble Algerian", "flag": "DZ", "region": "Algeria"},
    {"id": "ar-DZ-AminaNeural", "name": "Amina (أمينة)", "lang": "ar", "gender": "Female", "style": "Warm & Gentle Algerian", "flag": "DZ", "region": "Algeria"},
    {"id": "ar-TN-HediNeural", "name": "Hedi (الهادي)", "lang": "ar", "gender": "Male", "style": "Classical Mediterranean", "flag": "TN", "region": "Tunisia"},
    {"id": "ar-LB-RamiNeural", "name": "Rami (رامي)", "lang": "ar", "gender": "Male", "style": "Engaging Levant Narrator", "flag": "LB", "region": "Lebanon"},
    {"id": "ar-LB-LaylaNeural", "name": "Layla (ليلى)", "lang": "ar", "gender": "Female", "style": "Emotive Levant Storyteller", "flag": "LB", "region": "Lebanon"},
    {"id": "ar-SY-LaithNeural", "name": "Laith (ليث)", "lang": "ar", "gender": "Male", "style": "Resonant Syrian Dramatic", "flag": "SY", "region": "Syria"},
    {"id": "ar-JO-TaimNeural", "name": "Taim (تيم)", "lang": "ar", "gender": "Male", "style": "Dynamic Youth Storyteller", "flag": "JO", "region": "Jordan"},
    {"id": "ar-IQ-BasselNeural", "name": "Bassel (باسل)", "lang": "ar", "gender": "Male", "style": "Deep Mesopotamian Voice", "flag": "IQ", "region": "Iraq"},

    # English Voices (US, UK, Australia)
    {"id": "en-US-ChristopherNeural", "name": "Christopher", "lang": "en", "gender": "Male", "style": "Cinematic Movie Trailer Narrator", "flag": "US", "region": "United States"},
    {"id": "en-US-JennyNeural", "name": "Jenny", "lang": "en", "gender": "Female", "style": "Expressive & Warm Storyteller", "flag": "US", "region": "United States"},
    {"id": "en-US-GuyNeural", "name": "Guy", "lang": "en", "gender": "Male", "style": "Bold & Dynamic Action Hero", "flag": "US", "region": "United States"},
    {"id": "en-US-AriaNeural", "name": "Aria", "lang": "en", "gender": "Female", "style": "Emotional & Dramatic Actress", "flag": "US", "region": "United States"},
    {"id": "en-US-EricNeural", "name": "Eric", "lang": "en", "gender": "Male", "style": "Crisp Modern Narrator", "flag": "US", "region": "United States"},
    {"id": "en-US-RogerNeural", "name": "Roger", "lang": "en", "gender": "Male", "style": "Mature & Wise Elder", "flag": "US", "region": "United States"},
    {"id": "en-US-AnaNeural", "name": "Ana", "lang": "en", "gender": "Female", "style": "Whimsical & Fairy Tale Voice", "flag": "US", "region": "United States"},
    {"id": "en-US-AndrewMultilingualNeural", "name": "Andrew", "lang": "en", "gender": "Male", "style": "Confident & Authentic Dialogue", "flag": "US", "region": "United States"},
    {"id": "en-US-AvaMultilingualNeural", "name": "Ava", "lang": "en", "gender": "Female", "style": "Caring & Melodic Dialogue", "flag": "US", "region": "United States"},
    {"id": "en-GB-RyanNeural", "name": "Ryan", "lang": "en", "gender": "Male", "style": "British Classical & Aristocratic", "flag": "GB", "region": "United Kingdom"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia", "lang": "en", "gender": "Female", "style": "BBC Documentary & Elegance", "flag": "GB", "region": "United Kingdom"},
    {"id": "en-AU-WilliamMultilingualNeural", "name": "William", "lang": "en", "gender": "Male", "style": "Rugged Adventurer & Explorer", "flag": "AU", "region": "Australia"},

    # French Voices (France, Canada, Belgium)
    {"id": "fr-FR-HenriNeural", "name": "Henri", "lang": "fr", "gender": "Male", "style": "Classic French Narrator", "flag": "FR", "region": "France"},
    {"id": "fr-FR-DeniseNeural", "name": "Denise", "lang": "fr", "gender": "Female", "style": "Elegant Parisian Storyteller", "flag": "FR", "region": "France"},
    {"id": "fr-FR-EloiseNeural", "name": "Éloïse", "lang": "fr", "gender": "Female", "style": "Young & Dynamic Dramatic", "flag": "FR", "region": "France"},
    {"id": "fr-FR-VivienneMultilingualNeural", "name": "Vivienne", "lang": "fr", "gender": "Female", "style": "Studio Voice Actress", "flag": "FR", "region": "France"},
    {"id": "fr-FR-RemyMultilingualNeural", "name": "Rémy", "lang": "fr", "gender": "Male", "style": "Smooth Modern French", "flag": "FR", "region": "France"},
    {"id": "fr-CA-AntoineNeural", "name": "Antoine", "lang": "fr", "gender": "Male", "style": "Deep & Resonant Canadian French", "flag": "CA", "region": "Canada"},
    {"id": "fr-CA-SylvieNeural", "name": "Sylvie", "lang": "fr", "gender": "Female", "style": "Warm Canadian Storyteller", "flag": "CA", "region": "Canada"},
    {"id": "fr-BE-GerardNeural", "name": "Gérard", "lang": "fr", "gender": "Male", "style": "Authoritative Belgian French", "flag": "BE", "region": "Belgium"},
]

DEFAULT_VOICE_MAP: dict[str, str] = {
    "ar": "ar-SA-HamedNeural",
    "en": "en-US-ChristopherNeural",
    "fr": "fr-FR-HenriNeural",
}

# Reading Style Profiles: Adapts prosody, pacing, pitch, and acoustic volume delivery
AVAILABLE_STYLES: list[dict[str, str]] = [
    {
        "id": "Cinematic",
        "name": "Cinematic Narration",
        "nameAr": "ملحمي سينمائي",
        "nameFr": "Narration Cinématographique",
        "icon": "",
        "description": "Deep chest resonance, measured epic pacing, dramatic movie trailer atmosphere.",
        "rate": "-8%",
        "pitch": "-5Hz",
        "volume": "+5%",
    },
    {
        "id": "Suspense",
        "name": "Suspense & Thriller",
        "nameAr": "تشويق وغموض",
        "nameFr": "Suspense & Mystère",
        "icon": "",
        "description": "Slow, calculated cadence, hushed tone, lingering dramatic tension.",
        "rate": "-14%",
        "pitch": "-8Hz",
        "volume": "-10%",
    },
    {
        "id": "Urgent",
        "name": "Urgent & Action",
        "nameAr": "حماسي وحركي",
        "nameFr": "Action & Urgence",
        "icon": "",
        "description": "Rapid tempo, punchy inflections, high-energy forward drive.",
        "rate": "+16%",
        "pitch": "+6Hz",
        "volume": "+15%",
    },
    {
        "id": "Whisper",
        "name": "Whisper & Secret",
        "nameAr": "همس وسري",
        "nameFr": "Murmure & Confidences",
        "icon": "",
        "description": "Soft muted delivery, intimate close-mic confidential delivery.",
        "rate": "-18%",
        "pitch": "-6Hz",
        "volume": "-30%",
    },
    {
        "id": "Documentary",
        "name": "Documentary & History",
        "nameAr": "وثائقي تاريخي",
        "nameFr": "Documentaire Historique",
        "icon": "",
        "description": "Steady, articulate, authoritative gravitas with crisp punctuation.",
        "rate": "-2%",
        "pitch": "+0Hz",
        "volume": "+5%",
    },
    {
        "id": "Storybook",
        "name": "Storybook & Fairy Tale",
        "nameAr": "حكايات وأساطير",
        "nameFr": "Conte & Merveilleux",
        "icon": "",
        "description": "Playful, melodic pitch modulation, warm bedtime tale cadence.",
        "rate": "-5%",
        "pitch": "+5Hz",
        "volume": "+0%",
    },
    {
        "id": "Emotional",
        "name": "Emotional & Melancholy",
        "nameAr": "مؤثر وحزين",
        "nameFr": "Émotionnel & Tristesse",
        "icon": "",
        "description": "Slow, sorrowful lingering pacing, gentle lowered pitch.",
        "rate": "-12%",
        "pitch": "-4Hz",
        "volume": "-15%",
    },
    {
        "id": "Dramatic",
        "name": "Dramatic & Theatrical",
        "nameAr": "مسرحي وتعبيري",
        "nameFr": "Théâtral & Expressif",
        "icon": "",
        "description": "Expressive theatrical delivery with broad dynamics and emotional presence.",
        "rate": "-6%",
        "pitch": "-3Hz",
        "volume": "+10%",
    },
    {
        "id": "Radio",
        "name": "Radio & Energetic",
        "nameAr": "إذاعي وحيوي",
        "nameFr": "Dynamique & Radio",
        "icon": "",
        "description": "Crisp, fast, projected radio broadcast enthusiasm.",
        "rate": "+12%",
        "pitch": "+7Hz",
        "volume": "+12%",
    },
    {
        "id": "Calm",
        "name": "Calm & Meditative",
        "nameAr": "هادئ ومريح",
        "nameFr": "Calme & Apaisant",
        "icon": "",
        "description": "Gentle, soothing flow, peaceful cadence for reflective narration.",
        "rate": "-8%",
        "pitch": "-2Hz",
        "volume": "-5%",
    },
    {
        "id": "HeatedArgument",
        "name": "Heated Argument & Confrontation",
        "nameAr": "مواجهة حادة وتصعيد",
        "nameFr": "Confrontation & Colère",
        "icon": "",
        "description": "Fast tempo, sharp vocal projection, aggressive confrontational spikes.",
        "rate": "+18%",
        "pitch": "+10Hz",
        "volume": "+25%",
    },
    {
        "id": "DefensiveStammer",
        "name": "Defensive & Hesitant Stammer",
        "nameAr": "دفاع مرتبك وتردد",
        "nameFr": "Défense Hésitante",
        "icon": "",
        "description": "Uneven cadence, emotional hesitation, strained defensive pitch.",
        "rate": "-4%",
        "pitch": "+5Hz",
        "volume": "-2%",
    },
    {
        "id": "VulnerableHeartbreak",
        "name": "Vulnerable Heartbreak & Whisper",
        "nameAr": "انكسار عاطفي وهمس",
        "nameFr": "Vulnérabilité Émouvante",
        "icon": "",
        "description": "Quiet, suppressed grief, slow emotional admission with intimate breath.",
        "rate": "-14%",
        "pitch": "-8Hz",
        "volume": "-22%",
    },
    {
        "id": "BitterSarcasm",
        "name": "Bitter Sarcasm & Mockery",
        "nameAr": "سخرية مريرة ولاذعة",
        "nameFr": "Sarcasme Amer",
        "icon": "",
        "description": "Biting irony, elongated emphasis, cool condescending cadence.",
        "rate": "+4%",
        "pitch": "-3Hz",
        "volume": "+12%",
    },
]

STYLE_LOOKUP = {s["id"]: s for s in AVAILABLE_STYLES}


class SynthesisRequest(BaseModel):
    text: str
    language: str = "en"
    voice: str | None = None
    style: str | None = None
    rate: str | None = None
    pitch: str | None = None
    volume: str | None = None


def compute_acoustic_params(
    style_id: str | None,
    custom_rate: str | None,
    custom_pitch: str | None,
    custom_volume: str | None,
) -> tuple[str, str, str]:
    """Combines style profile with custom fine-tuning offsets."""
    rate_val = 0
    pitch_val = 0
    volume_val = 0

    # 1. Start with style profile base
    if style_id and style_id in STYLE_LOOKUP:
        profile = STYLE_LOOKUP[style_id]
        # parse rate (e.g. "-8%")
        r_str = profile.get("rate", "0%").replace("%", "")
        rate_val = int(r_str) if r_str else 0

        p_str = profile.get("pitch", "0Hz").replace("Hz", "")
        pitch_val = int(p_str) if p_str else 0

        v_str = profile.get("volume", "0%").replace("%", "")
        volume_val = int(v_str) if v_str else 0

    # 2. Add custom rate adjustment if passed (e.g. "+10%")
    if custom_rate:
        try:
            cr = int(custom_rate.replace("%", ""))
            rate_val += cr
        except ValueError:
            pass

    # 3. Add custom pitch adjustment if passed (e.g. "-5Hz")
    if custom_pitch:
        try:
            cp = int(custom_pitch.replace("Hz", ""))
            pitch_val += cp
        except ValueError:
            pass

    # 4. Add custom volume adjustment if passed
    if custom_volume:
        try:
            cv = int(custom_volume.replace("%", ""))
            volume_val += cv
        except ValueError:
            pass

    # Clamp ranges to safe edge-tts limits
    rate_val = max(-50, min(100, rate_val))
    pitch_val = max(-50, min(50, pitch_val))
    volume_val = max(-50, min(50, volume_val))

    final_rate = f"{'+' if rate_val >= 0 else ''}{rate_val}%"
    final_pitch = f"{'+' if pitch_val >= 0 else ''}{pitch_val}Hz"
    final_volume = f"{'+' if volume_val >= 0 else ''}{volume_val}%"

    return final_rate, final_pitch, final_volume


@router.get("/voices")
async def get_voices(_token: Annotated[str, Depends(verify_bearer_token)]) -> list[dict[str, str]]:
    """Return all available studio-grade multilingual neural voices."""
    return AVAILABLE_VOICES


@router.get("/styles")
async def get_styles(_token: Annotated[str, Depends(verify_bearer_token)]) -> list[dict[str, str]]:
    """Return all available reading delivery styles with acoustic presets."""
    return AVAILABLE_STYLES


@router.post("/synthesize")
async def synthesize_speech(
    req: SynthesisRequest,
    _token: Annotated[str, Depends(verify_bearer_token)],
) -> Response:
    """Synthesize text into studio-grade neural speech audio with adapted reading style."""
    import re

    voice = req.voice or DEFAULT_VOICE_MAP.get(req.language.lower(), "ar-SA-HamedNeural" if req.language == "ar" else "en-US-ChristopherNeural")

    rate, pitch, volume = compute_acoustic_params(
        req.style, req.rate, req.pitch, req.volume
    )

    # Robust text normalization: handle any form of text (spaces, newlines, tabs, symbols)
    raw_text = req.text or ""
    # Convert consecutive newlines to periods for natural speech pauses
    normalized_text = re.sub(r"[\r\n]+", " . ", raw_text)
    # Collapse multiple consecutive spaces or tabs into a single space
    normalized_text = re.sub(r"[ \t]+", " ", normalized_text).strip()

    # If empty or only whitespace, provide a clear, helpful spoken placeholder
    if not normalized_text:
        if req.language.lower() == "ar":
            normalized_text = "أدخل نص الحوار هنا للاستماع إليه."
        elif req.language.lower() == "fr":
            normalized_text = "Entrez votre texte ici pour l'écouter."
        else:
            normalized_text = "Please enter dialogue text here to listen."

    audio_data = bytearray()
    try:
        communicate = edge_tts.Communicate(
            normalized_text,
            voice,
            rate=rate,
            pitch=pitch,
            volume=volume,
        )
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
    except Exception as e:
        # Fallback to default voice if specific voice failed
        fallback_voice = DEFAULT_VOICE_MAP.get(req.language.lower(), "ar-SA-HamedNeural" if req.language == "ar" else "en-US-ChristopherNeural")
        if voice != fallback_voice:
            communicate = edge_tts.Communicate(
                normalized_text,
                fallback_voice,
                rate=rate,
                pitch=pitch,
                volume=volume,
            )
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.extend(chunk["data"])
        else:
            raise e

    return Response(
        content=bytes(audio_data),
        media_type="audio/mpeg",
        headers={
            "Content-Length": str(len(audio_data)),
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        },
    )


class WordTiming(BaseModel):
    word: str
    start_ms: int
    duration_ms: int


class TimedSynthesisResponse(BaseModel):
    audio_base64: str
    words: list[WordTiming]


@router.post("/synthesize-with-timing", response_model=TimedSynthesisResponse)
async def synthesize_speech_with_timing(
    req: SynthesisRequest,
    _token: Annotated[str, Depends(verify_bearer_token)],
) -> TimedSynthesisResponse:
    """Synthesize speech and return both audio data (base64) and exact word boundary timestamps."""
    import base64
    import re

    voice = req.voice or DEFAULT_VOICE_MAP.get(
        req.language.lower(),
        "ar-SA-HamedNeural" if req.language == "ar" else "en-US-ChristopherNeural",
    )

    rate, pitch, volume = compute_acoustic_params(
        req.style, req.rate, req.pitch, req.volume
    )

    raw_text = req.text or ""
    normalized_text = re.sub(r"[\r\n]+", " . ", raw_text)
    normalized_text = re.sub(r"[ \t]+", " ", normalized_text).strip()

    if not normalized_text:
        normalized_text = "..."

    communicate = edge_tts.Communicate(
        normalized_text,
        voice,
        rate=rate,
        pitch=pitch,
        volume=volume,
    )

    audio_chunks = bytearray()
    words: list[WordTiming] = []

    try:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.extend(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append(
                    WordTiming(
                        word=chunk["text"],
                        start_ms=int(chunk["offset"] // 10_000),
                        duration_ms=int(chunk["duration"] // 10_000),
                    )
                )
    except Exception as e:
        print(f"[TTS Timing] Synthesis exception: {e}")

    audio_b64 = base64.b64encode(bytes(audio_chunks)).decode("utf-8")
    return TimedSynthesisResponse(audio_base64=audio_b64, words=words)


@router.get("/stream")
async def stream_speech(
    text: str = Query(..., description="Text to synthesize"),
    language: str = Query("en", description="Language code"),
    voice: str | None = Query(None, description="Specific voice ID"),
    style: str | None = Query(None, description="Reading delivery style"),
    token: str = Query(..., description="Bearer session token"),
) -> Response:
    """Stream speech via GET for audio tag playback."""
    from app.core.config import settings
    import secrets

    if not secrets.compare_digest(token, settings.SESSION_TOKEN):
        return Response(status_code=401, content="Unauthorized")

    chosen_voice = voice or DEFAULT_VOICE_MAP.get(language.lower(), "en-US-ChristopherNeural")
    rate, pitch, volume = compute_acoustic_params(style, None, None, None)

    communicate = edge_tts.Communicate(
        text,
        chosen_voice,
        rate=rate,
        pitch=pitch,
        volume=volume,
    )

    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])

    return Response(content=bytes(audio_data), media_type="audio/mpeg")
