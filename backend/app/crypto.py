"""
Cifrado en reposo del contenido del diario.

El texto que escribe la usuaria es el dato más sensible de toda la app,
así que se cifra ANTES de tocar la base de datos y se descifra solo al
devolverlo a su propia dueña (nunca se guarda en claro en el disco).

ENCRYPTION_KEY debe ser una clave Fernet real en producción (ver
generate_key() más abajo para crear una). En dev, si no está puesta,
se genera una de usar-y-tirar al arrancar — los datos NO sobreviven a
un reinicio del proceso en ese caso, es solo para desarrollo local.
"""
import os

from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

# No depende de que app.config se haya importado antes -> carga el .env
# aquí también, es idempotente (llamarlo dos veces no hace nada raro).
load_dotenv()

_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not _ENCRYPTION_KEY:
    print(
        "[MindCheck] AVISO: ENCRYPTION_KEY no está definida. Generando una "
        "clave temporal SOLO para desarrollo — los datos cifrados no serán "
        "legibles tras reiniciar el proceso. Genera una fija con "
        "generate_key() para producción."
    )
    _ENCRYPTION_KEY = Fernet.generate_key().decode()

_fernet = Fernet(
    _ENCRYPTION_KEY.encode() if isinstance(_ENCRYPTION_KEY, str) else _ENCRYPTION_KEY
)


def generate_key() -> str:
    """Genera una clave Fernet nueva. Ejecuta esto una vez y guarda el
    resultado como ENCRYPTION_KEY en tu .env / secretos de despliegue:

        python -c "from app.crypto import generate_key; print(generate_key())"
    """
    return Fernet.generate_key().decode()


def encrypt_text(plain: str) -> str:
    return _fernet.encrypt(plain.encode()).decode()


def decrypt_text(token: str) -> str:
    try:
        return _fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        # Dato cifrado con una clave distinta (p.ej. cambiaste ENCRYPTION_KEY)
        # -> no lo reventamos, devolvemos un placeholder visible.
        return "[No se pudo descifrar esta entrada]"