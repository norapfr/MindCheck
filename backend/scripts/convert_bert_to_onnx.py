"""
Exporta bert-base-uncased a ONNX (float32, SIN cuantizar) — mismos pesos
exactos, runtime mucho más ligero que PyTorch + transformers completo.

Se ejecuta UNA VEZ, en local, con torch y transformers completos
instalados. El .onnx y el tokenizer resultantes son los que carga
producción, vía onnxruntime, sin necesidad de PyTorch.

Uso:
    python convert_bert_to_onnx.py
"""
import sys

# Forzar UTF-8 en stdout/stderr para evitar UnicodeEncodeError en Windows
# (la consola por defecto usa cp1252, que no soporta emojis/checkmarks
# que imprime el exporter de torch.onnx).
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

import torch
from transformers import BertModel, BertTokenizer

# Debe coincidir con max_seq en embeddings.py.
_SEQ_LEN = 132

_OUTPUT_ONNX = "bert_base_uncased.onnx"
_OUTPUT_TOKENIZER_DIR = "bert_tokenizer"


def main():
    print("[convert] Descargando tokenizer y modelo bert-base-uncased...")
    tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")
    model = BertModel.from_pretrained("bert-base-uncased")
    model.eval()

    print("[convert] Exportando a ONNX (float32, sin cuantizar, seq_len fijo)...")
    dummy_input_ids = torch.zeros((1, _SEQ_LEN), dtype=torch.long)
    dummy_attention_mask = torch.ones((1, _SEQ_LEN), dtype=torch.long)
    dummy_token_type_ids = torch.zeros((1, _SEQ_LEN), dtype=torch.long)

    torch.onnx.export(
        model,
        (dummy_input_ids, dummy_attention_mask, dummy_token_type_ids),
        _OUTPUT_ONNX,
        input_names=["input_ids", "attention_mask", "token_type_ids"],
        output_names=["last_hidden_state", "pooler_output"],
        dynamic_axes={
            "input_ids": {0: "batch"},
            "attention_mask": {0: "batch"},
            "token_type_ids": {0: "batch"},
            "last_hidden_state": {0: "batch"},
        },
        opset_version=18,
    )
    print(f"[convert] Guardado en {_OUTPUT_ONNX}")

    print("[convert] Guardando tokenizer localmente...")
    tokenizer.save_pretrained(_OUTPUT_TOKENIZER_DIR)
    print(f"[convert] Guardado en {_OUTPUT_TOKENIZER_DIR}/")

    print("[convert] Listo. Sube ambos junto al código del backend.")


if __name__ == "__main__":
    main()