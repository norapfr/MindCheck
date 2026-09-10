import os

from dotenv import load_dotenv

# Carga backend/.env si existe. En producción (Docker, hosting) las
# variables ya vienen del entorno y esto simplemente no encuentra el
# archivo y no hace nada.
load_dotenv()

# --- Umbral de riesgo ---
# Por encima de este valor, el frontend debe redirigir automáticamente
# a la pantalla de recursos de ayuda, sin fricción.
RISK_THRESHOLD_HIGH = float(os.getenv("RISK_THRESHOLD_HIGH", "0.7"))

# --- Categorías que puede devolver el modelo ---
# Ajusta esto a las categorías reales que devuelve tu pipeline de SocialMindScan.
RISK_CATEGORIES = ["low", "moderate", "high"]

# Palabras mínimas DESPUÉS de clean_text (no en el texto crudo). Menos
# de esto y el embedding de BERT es en gran parte padding -> predicciones
# poco fiables. Se comprueba tras el preprocesado a propósito.
MIN_WORDS_AFTER_CLEANING = 30

# --- Auth / JWT ---
# En producción, esto DEBE venir de una variable de entorno / secreto real,
# nunca hardcodeado ni versionado en git.
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_ME_INSECURE_DEV_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# --- Base de datos ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mindcheck.db")