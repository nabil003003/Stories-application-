"""StoryForge Studio — Neural AI Story & Screenplay Generation Engine
Supports local Ollama LLMs with high-fidelity fallback templates for Arabic, English, and French.
"""

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import verify_bearer_token

router = APIRouter(prefix="/ai", tags=["AI"])


class StoryPromptRequest(BaseModel):
    prompt: str
    language: str = "en"
    genre: str = "drama"


class StoryResponse(BaseModel):
    script: str
    source: str


SCRIPTS_TEMPLATE: dict[str, dict[str, str]] = {
    "en": {
        "drama": (
            "Elena: We cannot pretend this didn't happen anymore.\n"
            "Marcus: I was trying to protect our family, Elena!\n"
            "Elena: By keeping secrets? Look where that brought us.\n"
            "Marcus: If I spoke earlier, we would have lost everything.\n"
            "Elena: Maybe so. But at least we would have had the truth.\n"
            "Marcus: The truth is a luxury we never had."
        ),
        "suspense": (
            "Detective: The back door was unlocked from the inside.\n"
            "Witness: Are you implying someone let them in?\n"
            "Detective: The security footage was looped at precisely eleven.\n"
            "Witness: That's impossible... only two people have the security codes.\n"
            "Detective: And one of them is standing right here in front of me."
        ),
        "scifi": (
            "Commander: We lost contact with Beacon Seven two hours ago.\n"
            "Aria: The anomaly is expanding faster than our sub-light drives.\n"
            "Commander: Reroute auxiliary power to the containment shields.\n"
            "Aria: Shield frequency is collapsing! It is not an anomaly, Commander... it's communicating."
        ),
    },
    "ar": {
        "drama": (
            "طارق: لم يعد بإمكاننا تجاهل ما حدث بيننا.\n"
            "ليلى: كنت أحاول حماية العائلة بكل ما أوتيت من قوة يا طارق!\n"
            "طارق: بالكتمان والأسرار؟ انظري إلى أين أوصلنا ذلك الآن.\n"
            "ليلى: لو أعلنت الحقيقة حينها لخسرنا كل شيء.\n"
            "طارق: ربما، لكن الصدق كان سيمنحنا فرصة ثانية على الأقل."
        ),
        "suspense": (
            "المحقق: القفل كُسر من الداخل وليس من الخارج.\n"
            "الشاهد: هل تعني أن هناك من ساعدهم على الدخول؟\n"
            "المحقق: تسجيلات المراقبة تم قطعها عند الحادية عشرة تماماً.\n"
            "الشاهد: هذا غير معقول... شخصان فقط يملكان الرمز السري.\n"
            "المحقق: وأحدهما يقف أمامي الآن بكل هدوء."
        ),
    },
    "fr": {
        "drama": (
            "Claire: Nous ne pouvons plus faire semblant d'ignorer la vérité.\n"
            "Julien: Tout ce que j'ai fait, c'était pour nous protéger, Claire !\n"
            "Claire: En accumulant les mensonges ? Regarde où nous en sommes arrivés.\n"
            "Julien: Si j'avais parlé plus tôt, nous aurions tout perdu.\n"
            "Claire: Peut-être bien. Mais au moins, nous aurions conservé notre dignité."
        ),
        "suspense": (
            "Inspecteur: La porte d'accès a été déverrouillée depuis l'intérieur.\n"
            "Témoin: Insinuez-vous que quelqu'un les a délibérément aidés ?\n"
            "Inspecteur: Les enregistrements de surveillance ont été neutralisés à onze heures précises.\n"
            "Témoin: C'est tout bonnement impossible... seules deux personnes connaissent ce code.\n"
            "Inspecteur: Et l'une d'entre elles se tient précisément devant moi."
        ),
    },
}


def generate_template_script(language: str, genre: str, prompt: str) -> str:
    lang = language.lower() if language.lower() in SCRIPTS_TEMPLATE else "en"
    genre_key = genre.lower() if genre.lower() in SCRIPTS_TEMPLATE[lang] else "drama"
    base = SCRIPTS_TEMPLATE[lang].get(genre_key, SCRIPTS_TEMPLATE[lang]["drama"])
    return base


@router.post("/generate-story", response_model=StoryResponse)
async def generate_story(
    req: StoryPromptRequest,
    _token: Annotated[str, Depends(verify_bearer_token)],
) -> StoryResponse:
    """Generate a formatted dramatic dialogue screenplay from a prompt using local Ollama or template."""
    system_prompt = (
        "You are an acclaimed cinematic screenplay writer. Generate a dramatic dialogue scene (6-10 lines) "
        f"in language '{req.language}'. Format each line STRICTLY as: 'CharacterName: dialogue'. "
        "No narration markers, no preface, no markdown formatting. Just CharacterName: line."
    )

    # 1. Attempt local Ollama generation if available
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3.2",
                    "prompt": f"{system_prompt}\n\nPremise: {req.prompt}\nGenre: {req.genre}",
                    "stream": False,
                },
            )
            if resp.status_code == 200:
                raw_text = resp.json().get("response", "").strip()
                if raw_text and ":" in raw_text:
                    return StoryResponse(script=raw_text, source="ollama")
    except Exception:
        pass

    # 2. Curated fallback template generator
    template = generate_template_script(req.language, req.genre, req.prompt)
    return StoryResponse(script=template, source="template")
