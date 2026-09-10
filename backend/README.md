# MindCheck — Backend (FastAPI)

API que sirve el modelo de análisis de riesgo de MindCheck (basado en el
trabajo de SocialMindScan). **No diagnostica ni sustituye ayuda profesional.**

## Levantar en local

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Docs interactivas (Swagger): http://localhost:8000/docs

## Levantar con Docker

```bash
cd backend
docker build -t mindcheck-backend .
docker run -p 8000:8000 -e JWT_SECRET=un-secreto-real mindcheck-backend
```

## Endpoints

| Método | Ruta            | Auth | Descripción |
|--------|-----------------|------|-------------|
| POST   | /auth/register  | No   | Crea usuario, devuelve JWT |
| POST   | /auth/login     | No   | Form `username`+`password`, devuelve JWT |
| POST   | /analyze        | Sí   | `{text}` → `{risk_score, category, high_risk}` |
| GET    | /entries        | Sí   | Historial de entradas del usuario (para la gráfica) |
| GET    | /health         | No   | Health check |

## Estado actual

- `/analyze` usa un **mock** (`app/model/loader.py`) que devuelve un score
  aleatorio. Sustitúyelo por la carga real de tu checkpoint CNN+SBERT
  (F1 0.893) siguiendo las instrucciones dentro de ese archivo.
- Auth con JWT + bcrypt, ya incluida en el MVP.
- SQLite vía SQLAlchemy. El esquema (`app/database.py`) está pensado para
  migrar a Postgres/Supabase/Firebase sin reescribir la lógica de negocio.

## Siguientes pasos (fase mobile)

1. Integrar el modelo real en `app/model/loader.py`.
2. Montar el frontend Expo (React Native) consumiendo estos endpoints.
3. Umbral de riesgo alto configurable vía `RISK_THRESHOLD_HIGH` (por
   defecto 0.7) — el campo `high_risk` de `/analyze` le dice al frontend
   cuándo redirigir sin fricción a la pantalla de recursos de ayuda.

Para el desarrollo iterativo de la app móvil (Expo, pantallas, integración
con este backend) te va a ir mejor un entorno con ejecución real de código
como Claude Code, en lugar del chat.
