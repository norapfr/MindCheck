"""
Genera los input_ids/attention_mask de referencia que produce el
tokenizer real de Python (BertTokenizer) para los mismos 12 textos de
prueba, YA pasados por clean_text (igual que hace /preprocess). Sirve
para validar que la tokenización WordPiece implementada en TypeScript
para el móvil da exactamente los mismos IDs.

Uso:
    python scripts/generate_tokenizer_baseline.py
"""
import json
import sys
from pathlib import Path

# Asegura que 'backend/' esté en sys.path sin importar desde dónde se
# ejecute este script (python añade la carpeta del propio script, no
# la carpeta de trabajo actual, así que 'app' no se ve por defecto).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from transformers import BertTokenizer

from app.model.preprocessing import clean_text
from generate_baseline import TEST_TEXTS  # reutiliza los mismos 12 textos

_SEQ_LEN = 132


def main():
    tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")
    results = []

    for item in TEST_TEXTS:
        cleaned = clean_text(item["text"])
        encoded = tokenizer(
            cleaned,
            truncation=True,
            padding="max_length",
            max_length=_SEQ_LEN,
        )
        results.append({
            "id": item["id"],
            "cleaned_text": cleaned,
            "input_ids": encoded["input_ids"],
            "attention_mask": encoded["attention_mask"],
        })

    with open("tokenizer_baseline.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"[baseline] Guardado tokenizer_baseline.json ({len(results)} textos)")


if __name__ == "__main__":
    main()