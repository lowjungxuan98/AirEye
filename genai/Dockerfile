FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install dependencies + the app package. Copy source first so setuptools'
# package discovery (`include = ["app*"]`) finds the package at build time.
COPY pyproject.toml ./
COPY app ./app
COPY ingest ./ingest
RUN pip install --no-cache-dir .

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
