"""
Extrae el vocabulario de tokenizer.json (formato moderno de la librería
"tokenizers") y lo guarda como vocab.txt clásico (un token por línea,
ordenado por su ID) — el formato que espera nuestro tokenizador
WordPiece implementado a mano en TypeScript (mobile/utils/bertTokenizer.ts).

Uso (desde cualquier directorio):
    python scripts/extract_vocab_from_tokenizer_json.py
"""
import json
from pathlib import Path

# Ruta absoluta relativa a este propio archivo, para que funcione sin
# importar desde dónde se ejecute. bert_tokenizer/ vive dentro de
# app/model/weights/, no en scripts/.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_TOKENIZER_DIR = _BACKEND_ROOT / "app" / "model" / "weights" / "bert_tokenizer"
_INPUT = _TOKENIZER_DIR / "tokenizer.json"
_OUTPUT = _TOKENIZER_DIR / "vocab.txt"


def main():
    if not _INPUT.exists():
        raise FileNotFoundError(
            f"No se encontró {_INPUT}. Si tu carpeta bert_tokenizer/ está en "
            f"otro sitio, ajusta _TOKENIZER_DIR en este script."
        )

    with open(_INPUT, encoding="utf-8") as f:
        data = json.load(f)

    vocab = data.get("model", {}).get("vocab")
    if vocab is None:
        raise ValueError(
            "No se encontró 'model.vocab' dentro de tokenizer.json. "
            f"Claves de nivel superior encontradas: {list(data.keys())}"
        )

    sorted_tokens = sorted(vocab.items(), key=lambda kv: kv[1])

    with open(_OUTPUT, "w", encoding="utf-8") as f:
        for token, _id in sorted_tokens:
            f.write(token + "\n")

    print(f"[extract] Guardado {_OUTPUT} ({len(sorted_tokens)} tokens)")


if __name__ == "__main__":
    main()