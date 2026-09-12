"""
Compara las predicciones del backend ACTUAL (tras convertir a TFLite)
contra baseline_scores.json generado antes de la conversión. Si las
diferencias son mínimas y ninguna categoría cambia, la conversión es segura.

Uso:
    python compare_to_baseline.py --url http://localhost:8000 --baseline baseline_scores.json
"""
import argparse
import json
import sys

import requests

from generate_baseline import TEST_TEXTS, get_token  # reutiliza los mismos textos y auth

# Umbral de diferencia aceptable. Con una conversión de motor SIN cuantizar,
# las diferencias esperadas son del orden de 1e-5 o menores (redondeo de
# punto flotante entre TensorFlow y TFLite). Cualquier cosa por encima de
# esto merece investigarse antes de confiar en la conversión.
MAX_ACCEPTABLE_DIFF = 0.01


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--baseline", default="baseline_scores.json")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    with open(args.baseline) as f:
        baseline = {item["id"]: item for item in json.load(f)}

    token = get_token(base_url)
    headers = {"Authorization": f"Bearer {token}"}

    any_category_changed = False
    max_diff_seen = 0.0

    print(f"{'id':<4} {'dep_diff':>10} {'suic_diff':>10} {'cat before':>12} {'cat after':>12} {'status':>8}")
    print("-" * 60)

    for item in TEST_TEXTS:
        base = baseline.get(item["id"])
        if base is None:
            print(f"[warn] No hay baseline para id={item['id']}, se omite.")
            continue

        resp = requests.post(f"{base_url}/analyze", json={"text": item["text"]}, headers=headers)
        if resp.status_code != 200:
            print(f"[error] id={item['id']} -> HTTP {resp.status_code}: {resp.text}", file=sys.stderr)
            continue

        new = resp.json()

        dep_diff = abs(new["depression_score"] - base["depression_score"])
        suic_diff = abs(new["suicide_risk_score"] - base["suicide_risk_score"])
        max_diff_seen = max(max_diff_seen, dep_diff, suic_diff)

        category_changed = new["category"] != base["category"]
        if category_changed:
            any_category_changed = True

        status = "FAIL" if category_changed or dep_diff > MAX_ACCEPTABLE_DIFF or suic_diff > MAX_ACCEPTABLE_DIFF else "ok"

        print(f"{item['id']:<4} {dep_diff:>10.6f} {suic_diff:>10.6f} {base['category']:>12} {new['category']:>12} {status:>8}")

    print("-" * 60)
    print(f"Diferencia máxima observada: {max_diff_seen:.6f}")
    if any_category_changed:
        print("\n⚠️  ALERTA: al menos una categoría (low/moderate/high) cambió. NO despliegues esto sin revisar a fondo.")
        sys.exit(1)
    elif max_diff_seen > MAX_ACCEPTABLE_DIFF:
        print(f"\n⚠️  ALERTA: hay diferencias por encima del umbral aceptable ({MAX_ACCEPTABLE_DIFF}).")
        sys.exit(1)
    else:
        print("\n✅ Las predicciones se mantienen consistentes. La conversión parece segura.")


if __name__ == "__main__":
    main()