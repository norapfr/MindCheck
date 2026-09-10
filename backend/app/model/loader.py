"""
Carga real de los modelos de MindCheck.

Dos modelos independientes, entrenados por separado:
  - Depresion: norapfr/mindCheck_depression / gru_depression_bert.keras
  - Riesgo de suicidio: norapfr/mindCheck_suicidio / cnn_suicidio_bert.keras
"""
import numpy as np
import tensorflow as tf
from app.config import MIN_WORDS_AFTER_CLEANING
from app.model.exceptions import TextTooShortError
from huggingface_hub import hf_hub_download

from app.model.preprocessing import clean_text
from app.model.embeddings import getting_embedding_bert

_DEPRESSION_REPO = "norapfr/mindCheck_depression"
_DEPRESSION_FILE = "gru_depression_bert.keras"

_SUICIDE_REPO = "norapfr/mindCheck_suicidio"
_SUICIDE_FILE = "cnn_suicidio_bert.keras"

_MAX_SEQ = 132


def _load_keras_model_from_hub(repo_id: str, filename: str) -> tf.keras.Model:
    local_path = hf_hub_download(repo_id=repo_id, filename=filename)
    return tf.keras.models.load_model(local_path)


print("[MindCheck] Descargando/cargando modelo de depresion...")
_depression_model = _load_keras_model_from_hub(_DEPRESSION_REPO, _DEPRESSION_FILE)

print("[MindCheck] Descargando/cargando modelo de riesgo de suicidio...")
_suicide_model = _load_keras_model_from_hub(_SUICIDE_REPO, _SUICIDE_FILE)

print("[MindCheck] Modelos cargados.")


def _predict_single(model: tf.keras.Model, embedding: np.ndarray) -> float:
    batch = np.expand_dims(embedding.astype(np.float32), axis=0)
    raw = model.predict(batch, verbose=0)
    return float(np.ravel(raw)[0])


def predict_risk(text: str) -> dict:
    cleaned = clean_text(text)

    word_count = len(cleaned.split())
    if word_count < MIN_WORDS_AFTER_CLEANING:
        raise TextTooShortError(word_count, MIN_WORDS_AFTER_CLEANING)

    embedding = getting_embedding_bert(cleaned, max_seq=_MAX_SEQ)

    depression_score = _predict_single(_depression_model, embedding)
    suicide_score = _predict_single(_suicide_model, embedding)

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