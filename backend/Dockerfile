FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN useradd -m -u 1000 appuser
USER appuser

COPY app ./app

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 7860 --workers 1"]