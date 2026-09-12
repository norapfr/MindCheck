"""
Carga real de los modelos de MindCheck — versión TFLite, cargados desde
disco local (app/model/weights/), no desde Hugging Face Hub.

Los modelos se convirtieron una vez con scripts/convert_to_tflite.py.
Cargarlos localmente evita depender de que Hugging Face Hub esté
disponible en el arranque del servidor, y elimina la descarga en cada
despliegue nuevo.
"""
from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter

from app.config import MIN_WORDS_AFTER_CLEANING
from app.model.exceptions import TextTooShortError
from app.model.preprocessing import clean_text
from app.model.embeddings import getting_embedding_bert

_WEIGHTS_DIR = Path(__file__).parent / "weights"
_DEPRESSION_PATH = _WEIGHTS_DIR / "depression_model.tflite"
_SUICIDE_PATH = _WEIGHTS_DIR / "suicide_model.tflite"

_MAX_SEQ = 132


def _load_tflite_interpreter(path: Path) -> Interpreter:
    if not path.exists():
        raise FileNotFoundError(
            f"No se encontró el modelo en {path}. Genera los .tflite con "
            f"scripts/convert_to_tflite.py y colócalos en {_WEIGHTS_DIR}."
        )
    interpreter = Interpreter(model_path=str(path))
    interpreter.allocate_tensors()
    return interpreter


print("[MindCheck] Cargando modelo de depresion (TFLite, local)...")
_depression_interpreter = _load_tflite_interpreter(_DEPRESSION_PATH)

print("[MindCheck] Cargando modelo de riesgo de suicidio (TFLite, local)...")
_suicide_interpreter = _load_tflite_interpreter(_SUICIDE_PATH)

print("[MindCheck] Modelos cargados.")


def _predict_single(interpreter: Interpreter, embedding: np.ndarray) -> float:
    batch = np.expand_dims(embedding.astype(np.float32), axis=0)

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    interpreter.set_tensor(input_details[0]["index"], batch)
    interpreter.invoke()
    raw = interpreter.get_tensor(output_details[0]["index"])

    return float(np.ravel(raw)[0])


def predict_risk(text: str) -> dict:
    cleaned = clean_text(text)

    word_count = len(cleaned.split())
    if word_count < MIN_WORDS_AFTER_CLEANING:
        raise TextTooShortError(word_count, MIN_WORDS_AFTER_CLEANING)

    embedding = getting_embedding_bert(cleaned, max_seq=_MAX_SEQ)

    depression_score = _predict_single(_depression_interpreter, embedding)
    suicide_score = _predict_single(_suicide_interpreter, embedding)

    risk_score = max(depression_score, suicide_score)
    if risk_score >= 0.7:
        category = "high"
    elif risk_score >= 0.4:
        category = "moderate"
    else:
        category = "low"

    return {
        "depression_score": depression_score,
        "suicide_risk_score": suicide_score,
        "risk_score": risk_score,
        "category": category,
    }