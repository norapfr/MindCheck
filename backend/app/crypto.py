import os

from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

from app.config import ENVIRONMENT

load_dotenv()

_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not _ENCRYPTION_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError(
            "ENCRYPTION_KEY no está configurada en producción. Define la "
            "variable de entorno ENCRYPTION_KEY con una clave Fernet real "
            "antes de arrancar — sin ella, los datos cifrados serán "
            "ilegibles tras cada reinicio."
        )
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
        return "[No se pudo descifrar esta entrada]"