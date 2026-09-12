"""
Generación de embeddings BERT — versión ONNX Runtime, cargada desde
disco local (app/model/weights/), sin PyTorch en producción.

Convertido una vez con scripts/convert_bert_to_onnx.py.
"""
from pathlib import Path

import numpy as np
import onnxruntime as ort
from transformers import BertTokenizer

_WEIGHTS_DIR = Path(__file__).parent / "weights"
_ONNX_PATH = _WEIGHTS_DIR / "bert_base_uncased.onnx"
_TOKENIZER_DIR = _WEIGHTS_DIR / "bert_tokenizer"

if not _ONNX_PATH.exists():
    raise FileNotFoundError(
        f"No se encontró {_ONNX_PATH}. Genera el modelo con "
        f"scripts/convert_bert_to_onnx.py y colócalo en {_WEIGHTS_DIR}."
    )

_tokenizer_bert = BertTokenizer.from_pretrained(str(_TOKENIZER_DIR))
_session = ort.InferenceSession(str(_ONNX_PATH), providers=["CPUExecutionProvider"])


def getting_embedding_bert(texto: str, max_seq: int = 132) -> np.ndarray:
    inputs = _tokenizer_bert(
        texto,
        return_tensors="np",
        truncation=True,
        padding="max_length",
        max_length=max_seq,
    )
    attention_mask = inputs["attention_mask"].astype(np.int64)
    input_ids = inputs["input_ids"].astype(np.int64)
    token_type_ids = inputs.get("token_type_ids", np.zeros_like(input_ids)).astype(np.int64)

    ort_inputs = {
        "input_ids": input_ids,
        "attention_mask": attention_mask,
        "token_type_ids": token_type_ids,
    }
    (last_hidden_state,) = _session.run(["last_hidden_state"], ort_inputs)

    token_embs = last_hidden_state * attention_mask[:, :, None]
    token_embs = token_embs[:, 1:-1, :]

    return token_embs.squeeze(0).astype(np.float16)