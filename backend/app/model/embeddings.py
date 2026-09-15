"""
Generación de embeddings BERT — versión ONNX Runtime. El .onnx (con su
.onnx_data externo, ~400MB) se descarga de Hugging Face Hub en el
arranque en vez de vivir en el repo de git, para evitar el límite de
100MB por archivo de GitHub y los límites de ancho de banda de Git LFS.
"""
from pathlib import Path

import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download
from transformers import BertTokenizer

_WEIGHTS_DIR = Path(__file__).parent / "weights"
_TOKENIZER_DIR = _WEIGHTS_DIR / "bert_tokenizer"  # esto sí es pequeño, va en git normal

_ONNX_REPO = "norapfr/mindCheck_depression"  # o el repo que prefieras usar para esto
_ONNX_FILE = "bert_base_uncased.onnx"
_ONNX_DATA_FILE = "bert_base_uncased.onnx.data"

print("[MindCheck] Descargando pesos ONNX de BERT desde Hugging Face Hub...")
_onnx_path = hf_hub_download(repo_id=_ONNX_REPO, filename=_ONNX_FILE)
# El .onnx_data debe descargarse al MISMO directorio que el .onnx, porque
# onnxruntime lo busca por convención junto al archivo índice.
hf_hub_download(repo_id=_ONNX_REPO, filename=_ONNX_DATA_FILE)
print("[MindCheck] BERT (ONNX) descargado.")

_tokenizer_bert = BertTokenizer.from_pretrained(str(_TOKENIZER_DIR))
_session = ort.InferenceSession(_onnx_path, providers=["CPUExecutionProvider"])


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