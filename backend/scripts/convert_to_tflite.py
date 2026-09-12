"""
Convierte los modelos Keras (.keras) descargados desde Hugging Face Hub
a formato TFLite (float32, SIN cuantizar) — mismos pesos exactos, motor
de ejecución mucho más ligero.

Usa model.export(..., format="litert"), la API oficial de Keras 3 para
este propósito. El intento anterior (construir un SavedModel a mano con
tf.function + get_concrete_function) no inicializaba correctamente las
variables de estado internas de la capa Bidirectional GRU, causando
"READ_VARIABLE ... variable != nullptr was not true" al invocar el
intérprete. model.export() usa el mecanismo interno correcto de Keras
para registrar esos recursos, evitando el problema de raíz.

Se fija la forma de entrada a batch=1 explícitamente (coincide con el
uso real: siempre se predice una entrada a la vez, nunca en batch).

Se ejecuta UNA VEZ, en local, con TensorFlow completo instalado. Los
.tflite resultantes son los que se suben al servidor de producción.

Uso:
    python convert_to_tflite.py
"""
import tensorflow as tf
from huggingface_hub import hf_hub_download

_DEPRESSION_REPO = "norapfr/mindCheck_depression"
_DEPRESSION_FILE = "gru_depression_bert.keras"

_SUICIDE_REPO = "norapfr/mindCheck_suicidio"
_SUICIDE_FILE = "cnn_suicidio_bert.keras"

# Debe coincidir con la forma real que produce getting_embedding_bert():
# max_seq=132 en embeddings.py, menos [CLS] y [SEP] recortados -> 130.
_SEQ_LEN = 130
_HIDDEN_SIZE = 768


def convert(repo_id: str, filename: str, output_name: str):
    print(f"[convert] Descargando {filename} de {repo_id}...")
    local_path = hf_hub_download(repo_id=repo_id, filename=filename)

    print(f"[convert] Cargando modelo Keras...")
    model = tf.keras.models.load_model(local_path)

    input_signature = [tf.TensorSpec([1, _SEQ_LEN, _HIDDEN_SIZE], tf.float32)]

    print(f"[convert] Exportando a LiteRT/TFLite (float32, sin cuantizar, batch=1)...")
    try:
        model.export(output_name, format="litert", input_signature=input_signature)
    except (TypeError, ValueError) as e:
        # Fallback por si esta versión de Keras/TF no reconoce format="litert"
        # todavía (alias más nuevo de "tflite"). Usa el mismo mecanismo de
        # export oficial, solo cambia el nombre del formato.
        print(f"[convert] format='litert' falló ({e}), probando format='tflite'...")
        model.export(output_name, format="tflite", input_signature=input_signature)

    print(f"[convert] Guardado en {output_name}\n")


if __name__ == "__main__":
    convert(_DEPRESSION_REPO, _DEPRESSION_FILE, "depression_model.tflite")
    convert(_SUICIDE_REPO, _SUICIDE_FILE, "suicide_model.tflite")
    print("[convert] Listo. Sube ambos .tflite junto al código del backend.")