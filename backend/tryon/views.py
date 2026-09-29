import logging
from datetime import timedelta

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import youcam
from .models import TryOn

log = logging.getLogger(__name__)

POLL_INTERVAL = timedelta(seconds=8)
RESULT_URL_TTL = timedelta(hours=2)
REQUIRED_HEADER = "X-Requested-With"  # Custom header forces a CORS preflight, blocking cross-site spend.

TASK_ERROR_MESSAGES = {
    "task_error": "The try-on couldn't be generated from these photos.",
}
TASK_ERROR_HINT = (
    "Try a front-facing photo of one standing adult with face and shoulders visible, "
    "and a front-facing photo of a single garment on a plain background."
)


def _error(code: str, message: str, status: int) -> Response:
    return Response({"error": {"code": code, "message": message}}, status=status)


def _session_key(request) -> str:
    if not request.session.session_key:
        request.session["created"] = timezone.now().isoformat()
        request.session.save()
    return request.session.session_key


def _session_used(key: str) -> int:
    return TryOn.objects.filter(session_key=key).count()


def _serialize(tryon: TryOn) -> dict:
    data = {"id": str(tryon.id), "state": tryon.state, "category": tryon.category, "source": "youcam_clothes_v4"}
    if tryon.state == TryOn.ERROR:
        data["error"] = {
            "code": tryon.error_code,
            "message": TASK_ERROR_MESSAGES.get(tryon.error_code, "The try-on service couldn't process these photos."),
            "hint": TASK_ERROR_HINT,
        }
    return data


def _owned(request, tryon_id):
    key = request.session.session_key
    return TryOn.objects.filter(id=tryon_id, session_key=key).first() if key else None


@api_view(["GET"])
def config_view(request):
    key = _session_key(request)
    return Response({
        "tryon_enabled": bool(settings.YOUCAM_API_KEY),
        "documented_units_per_preview": youcam.DOCUMENTED_UNITS,
        "session_limit": settings.TRYON_SESSION_LIMIT,
        "session_remaining": max(0, settings.TRYON_SESSION_LIMIT - _session_used(key)),
        "categories": sorted(youcam.CATEGORIES),
    })


@api_view(["POST"])
def create_tryon(request):
    if request.headers.get(REQUIRED_HEADER) != "fetch":
        return _error("bad_origin", "Missing request header.", 400)
    if not settings.YOUCAM_API_KEY:
        return _error("not_configured", "Virtual try-on isn't configured on this server yet.", 503)
    if request.data.get("consent") != "true":
        return _error("consent_required", "Please confirm consent before sending photos to YouCam.", 400)
    category = request.data.get("category")
    if category not in youcam.CATEGORIES:
        return _error("invalid_category", "This garment type can't be previewed yet.", 400)
    person, garment = request.FILES.get("person"), request.FILES.get("garment")
    if not person or not garment:
        return _error("missing_image", "Both a photo of you and a garment photo are required.", 400)

    key = _session_key(request)
    if TryOn.objects.filter(session_key=key, state=TryOn.RUNNING).exists():
        return _error("already_running", "A preview is already in progress.", 409)
    if _session_used(key) >= settings.TRYON_SESSION_LIMIT:
        return _error("session_limit", "You've used all previews for this session.", 429)
    today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if TryOn.objects.filter(created_at__gte=today).count() >= settings.TRYON_DAILY_LIMIT:
        return _error("daily_limit", "Today's preview limit for this demo has been reached.", 429)

    try:
        # Validate both images before any network call so bad input never spends credits.
        person_png = youcam.prepare_image(person.read(), "your")
        garment_png = youcam.prepare_image(garment.read(), "garment")
        task_id = youcam.create_task(settings.YOUCAM_API_KEY, person_png, garment_png, category)
    except youcam.YouCamError as exc:
        log.warning("try-on create failed: code=%s stage=%s", exc.code, exc.stage or "validate")
        status = 400 if exc.code.startswith("image_") or exc.code == "invalid_category" else 502
        if exc.code == "network":
            # Ambiguous: the task may exist. Never resubmit automatically.
            return _error("network", "Connection lost while creating the preview. Please wait before trying again.", 502)
        if exc.code == "rate_limited":
            status = 429
        return _error(exc.code, str(exc), status)

    tryon = TryOn.objects.create(session_key=key, provider_task_id=task_id, category=category)
    log.info("try-on created: id=%s", tryon.id)
    return Response(_serialize(tryon), status=201)


@api_view(["GET", "DELETE"])
def tryon_detail(request, tryon_id):
    tryon = _owned(request, tryon_id)
    if not tryon:
        return _error("not_found", "Preview not found.", 404)
    if request.method == "DELETE":
        tryon.result_url = ""
        tryon.state = TryOn.CLEARED if tryon.state != TryOn.RUNNING else tryon.state
        tryon.save(update_fields=["result_url", "state"])
        return Response(status=204)

    now = timezone.now()
    if tryon.state == TryOn.RUNNING and (not tryon.last_polled_at or now - tryon.last_polled_at >= POLL_INTERVAL):
        tryon.last_polled_at = now
        try:
            state, url, error_code = youcam.poll_task(settings.YOUCAM_API_KEY, tryon.provider_task_id)
        except youcam.YouCamError as exc:
            tryon.save(update_fields=["last_polled_at"])
            if exc.retryable:
                return Response({**_serialize(tryon), "notice": "Still waiting on the try-on service."})
            return _error(exc.code, str(exc), 502)
        tryon.state = state
        if state == TryOn.SUCCESS:
            tryon.result_url, tryon.finished_at = url, now
        elif state == TryOn.ERROR:
            tryon.error_code, tryon.finished_at = error_code or "task_error", now
            log.warning("try-on task error: id=%s code=%s", tryon.id, tryon.error_code)
        tryon.save()
    return Response(_serialize(tryon))


@api_view(["GET"])
def tryon_image(request, tryon_id):
    tryon = _owned(request, tryon_id)
    if not tryon or tryon.state != TryOn.SUCCESS or not tryon.result_url:
        return _error("not_found", "No result image is available.", 404)
    if tryon.finished_at and timezone.now() - tryon.finished_at > RESULT_URL_TTL:
        return _error("expired", "This preview has expired. Results are available for about 2 hours.", 410)
    try:
        content = youcam.download_result(tryon.result_url)
    except youcam.YouCamError as exc:
        return _error(exc.code, str(exc), 502)
    response = HttpResponse(content, content_type="image/png" if content[:4] == b"\x89PNG" else "image/jpeg")
    response["Cache-Control"] = "no-store"
    return response
