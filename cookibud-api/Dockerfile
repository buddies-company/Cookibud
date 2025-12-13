FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# install build deps then python deps
COPY cookibud-api/requirements-lock.txt ./requirements.txt
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --upgrade pip setuptools wheel \
    && pip install -r requirements.txt \
    && mkdir -p /app/static/uploads

# copy source
COPY cookibud-api/ /app/

ENV MONGO_URI=mongodb://mongo:27017/cookibud

EXPOSE 8000

# Run with a single worker by default; increase in production if needed
CMD ["uvicorn", "drivers.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
