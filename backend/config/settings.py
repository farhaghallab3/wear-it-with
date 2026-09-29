"""Local-first settings. Secrets come from the environment or the repo-root .env.local (never Git)."""

import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        name, sep, value = line.partition("=")
        if sep:
            # Real environment variables win over the file.
            os.environ.setdefault(name.strip(), value.strip().strip("\"'"))


_load_env_file(REPO_ROOT / ".env.local")

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
# A random fallback keeps dev working; sessions (and try-on ownership) reset on restart.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or secrets.token_urlsafe(50)
ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "rest_framework",
    "tryon",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG

# Person photos travel through memory only; cap request bodies a little above two 10 MB images.
DATA_UPLOAD_MAX_MEMORY_SIZE = 22_000_000
FILE_UPLOAD_MAX_MEMORY_SIZE = 22_000_000
FILE_UPLOAD_HANDLERS = ["django.core.files.uploadhandler.MemoryFileUploadHandler"]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "UNAUTHENTICATED_USER": None,
}

YOUCAM_API_KEY = os.environ.get("YOUCAM_API_KEY", "").strip()
# Local spend guards against the documented 2 units/image. Not a provider billing cap.
TRYON_SESSION_LIMIT = int(os.environ.get("TRYON_SESSION_LIMIT", "10"))
TRYON_DAILY_LIMIT = int(os.environ.get("TRYON_DAILY_LIMIT", "20"))

USE_TZ = True
TIME_ZONE = "UTC"
LANGUAGE_CODE = "en"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"tryon": {"handlers": ["console"], "level": "INFO"}},
}
