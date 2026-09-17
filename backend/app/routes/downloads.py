"""
Página pública de descarga del APK + contador de descargas.

Sirve la landing page en / (resolviendo el 404 que aparecía ahí desde
que no había ninguna ruta raíz definida) y cuenta cada descarga real
antes de redirigir al archivo, sin depender de JavaScript ni de
ningún servicio externo — todo vive en este mismo backend.
"""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db, AppDownload
from app.main import limiter

router = APIRouter()

APK_URL = "https://github.com/norapfr/MindCheck/releases/latest/download/mindcheck.apk"


def _render_landing(count: int) -> str:
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MindCheck</title>
<style>
    body {{
        margin: 0; padding: 0; min-height: 100vh;
        display: flex; align-items: center; justify-content: center;
        background: #FFF7F9; color: #3A2530;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }}
    .card {{
        max-width: 420px; width: 90%; text-align: center;
        background: #FFFFFF; border: 1px solid #F5D9E3; border-radius: 20px;
        padding: 40px 28px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }}
    h1 {{ font-size: 26px; margin: 0 0 4px 0; color: #D45C82; }}
    .tagline {{ font-size: 14px; color: #9C8790; margin-bottom: 28px; }}
    .download-btn {{
        display: inline-block; background: #E97CA0; color: #fff;
        text-decoration: none; font-weight: 600; font-size: 16px;
        padding: 14px 32px; border-radius: 12px; margin-bottom: 20px;
    }}
    .download-btn:active {{ background: #D45C82; }}
    .count {{ font-size: 13px; color: #9C8790; margin-bottom: 24px; }}
    .note {{ font-size: 12px; color: #9C8790; line-height: 1.6; }}
</style>
</head>
<body>
    <div class="card">
        <h1>🌸🧠 MindCheck</h1>
        <div class="tagline">A private, on-device mood journal</div>
        <a class="download-btn" href="/download">Descargar APK</a>
        <div class="count">{count} descarga{'s' if count != 1 else ''} hasta ahora</div>
        <div class="note">
            Solo Android. Al instalar, tu teléfono puede pedirte permitir
            "orígenes desconocidos" — es normal para apps compartidas
            fuera de Google Play.
        </div>
    </div>
</body>
</html>"""


@router.get("/", response_class=HTMLResponse)
def landing_page(db: Session = Depends(get_db)):
    count = db.query(AppDownload).count()
    return HTMLResponse(_render_landing(count))


@router.get("/download")
@limiter.limit("10/minute")
def download_apk(request: Request, db: Session = Depends(get_db)):
    db.add(AppDownload())
    db.commit()
    return RedirectResponse(url=APK_URL, status_code=307)