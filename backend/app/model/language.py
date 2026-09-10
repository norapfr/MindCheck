"""
Comprobación de idioma. Los dos modelos (depresión y suicidio) se
entrenaron sobre texto en inglés — pasarles texto en otro idioma da
predicciones sin sentido (silenciosamente, sin error), así que hay que
cortar esto ANTES del pipeline de embeddings/inferencia, no después.
"""
from langdetect import detect, LangDetectException, DetectorFactory

DetectorFactory.seed = 0

_MIN_CHARS_FOR_DETECTION = 12


def is_english(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < _MIN_CHARS_FOR_DETECTION:
        return True
    try:
        return detect(stripped) == "en"
    except LangDetectException:
        return True