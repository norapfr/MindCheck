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

# --- Entorno ---
# ENVIRONMENT=production en el hosting real activa validaciones estrictas
# de secretos más abajo. En local, sin esta variable, se asume "development".
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# --- Auth / JWT ---
_DEV_JWT_SECRET = "CHANGE_ME_INSECURE_DEV_SECRET"
JWT_SECRET = os.getenv("JWT_SECRET", _DEV_JWT_SECRET)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

if ENVIRONMENT == "production" and JWT_SECRET == _DEV_JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET no está configurado en producción. Define la variable "
        "de entorno JWT_SECRET con un secreto real antes de arrancar."
    )

# --- Base de datos ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mindcheck.db")

if ENVIRONMENT == "production" and DATABASE_URL.startswith("sqlite"):
    raise RuntimeError(
        "DATABASE_URL apunta a SQLite en producción. Define la variable "
        "de entorno DATABASE_URL con tu connection string de Postgres."
    )