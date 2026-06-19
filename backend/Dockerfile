FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt

RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch \
    && python -m pip install --no-cache-dir -r /app/requirements.txt

# Bake NLTK datasets into the image so the resume pipeline never depends on a
# runtime download (disabled in prod, fails in no-egress envs).
ENV NLTK_DATA=/usr/local/share/nltk_data
RUN python -m nltk.downloader -d /usr/local/share/nltk_data \
    punkt punkt_tab stopwords wordnet omw-1.4

COPY . /app/

RUN mkdir -p /app/staticfiles

CMD ["sh", "-c", "gunicorn core.wsgi --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --log-file -"]
