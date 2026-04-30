"""
Language detection and translation utilities for KisanMitra.
Supports Hindi (hi), Marathi (mr), and English (en).
"""

from langdetect import detect, DetectorFactory

# Make detection deterministic
DetectorFactory.seed = 0

# Supported languages
SUPPORTED_LANGUAGES = {"hi", "mr", "en"}
DEFAULT_LANGUAGE = "en"


def detect_language(text: str) -> str:
    """
    Detect the language of the input text.
    Returns 'hi', 'mr', or 'en'. Defaults to 'en' if detection fails
    or language is not supported.
    """
    try:
        lang = detect(text)
        if lang in SUPPORTED_LANGUAGES:
            return lang
        # langdetect may return 'hi' for Marathi sometimes;
        # both use Devanagari script. Check for Marathi-specific words.
        if lang == "hi" and _has_marathi_markers(text):
            return "mr"
        return DEFAULT_LANGUAGE
    except Exception:
        return DEFAULT_LANGUAGE


def _has_marathi_markers(text: str) -> bool:
    """
    Simple heuristic to distinguish Marathi from Hindi
    based on common Marathi words/particles.
    """
    marathi_markers = [
        "आहे", "काय", "माझा", "माझी", "माझे",
        "तुमचा", "तुमची", "करा", "सांगा", "हवे",
        "नाही", "शेती", "पीक", "जमीन", "कापूस",
    ]
    return any(marker in text for marker in marathi_markers)


def get_language_instruction(lang: str) -> str:
    """
    Return a prompt instruction for the LLM to respond in the correct language.
    """
    lang_map = {
        "hi": "Respond in Hindi (हिन्दी). Use Devanagari script.",
        "mr": "Respond in Marathi (मराठी). Use Devanagari script.",
        "en": "Respond in English.",
    }
    return lang_map.get(lang, lang_map["en"])
