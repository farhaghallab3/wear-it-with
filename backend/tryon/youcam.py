"""Minimal YouCam Clothes V4 client: register file -> signed PUT -> create task -> poll.

Contract: https://docs.perfectcorp.com/reference/ai_clothes/section/overview/integration-guide
Schema:   https://docs.perfectcorp.com/reference/ai_clothes/v4.0
Same rules as scripts/youcam_probe.py: never log keys, signed URLs, or provider bodies.
"""

from __future__ import annotations

import io
import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from PIL import Image, ImageOps, UnidentifiedImageError

API_BASE = "https://yce-api-01.makeupar.com"
TASK_PATH = "/s2s/v2.0/task/cloth-v4"
MAX_IMAGE_BYTES = 10_000_000
MAX_RESULT_BYTES = 25_000_000
DOCUMENTED_UNITS = 2  # V4 announcement; measured 2026-09-28: 1 success = 2 units, failed upload = 0.
CATEGORIES = {"upper_body", "lower_body", "outer", "full_body"}
_SAFE_CODE = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")


class YouCamError(Exception):
    """`code` is machine-readable for the UI; the message is safe to show."""

    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.stage = ""
        self.retryable = retryable


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def prepare_image(content: bytes, label: str) -> bytes:
    """Validate against documented limits, fix orientation, strip EXIF, re-encode as PNG."""
    if len(content) >= MAX_IMAGE_BYTES:
        raise YouCamError("image_too_large", f"The {label} photo must be under 10 MB.")
    try:
        with Image.open(io.BytesIO(content)) as original:
            if original.format not in {"JPEG", "PNG"}:
                raise YouCamError("image_format", f"The {label} photo must be a JPEG or PNG.")
            short, long = sorted(original.size)
            if short < 384 or long < 512 or long > 4096:
                raise YouCamError(
                    "image_dimensions",
                    f"The {label} photo needs a short side of at least 384px and a long side between 512 and 4096px.",
                )
            normalized = ImageOps.exif_transpose(original).convert("RGB")
            normalized.info.clear()
            output = io.BytesIO()
            normalized.save(output, format="PNG")
    except YouCamError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise YouCamError("image_unreadable", f"We couldn't read the {label} photo. Try exporting it as JPEG or PNG.") from None
    result = output.getvalue()
    if len(result) >= MAX_IMAGE_BYTES:
        raise YouCamError("image_too_large", f"The {label} photo is too large once processed. Try a smaller image.")
    return result


def _request(url: str, method: str, headers: dict, body: bytes | None = None, limit: int = 1_000_000) -> bytes:
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        raise YouCamError("provider_response", "The try-on service returned an invalid address.")
    req = Request(url, data=body, headers=headers, method=method)
    try:
        with build_opener(_NoRedirect()).open(req, timeout=30) as response:
            data = response.read(limit + 1)
    except HTTPError as exc:
        code, message, retryable = {
            401: ("auth", "The try-on service rejected the server's API key.", False),
            402: ("credits", "The try-on account is out of credits.", False),
            403: ("forbidden", "The try-on service refused this request.", False),
            413: ("image_too_large", "An image was too large for the try-on service.", False),
            429: ("rate_limited", "The try-on service is busy. Please wait a moment.", True),
        }.get(exc.code, ("provider_http", f"The try-on service returned HTTP {exc.code}.", exc.code >= 500))
        if exc.code == 400:
            code, message = _classify_400(exc)
        raise YouCamError(code, message, retryable) from None
    except (URLError, TimeoutError, OSError):
        raise YouCamError("network", "Couldn't reach the try-on service.", True) from None
    if len(data) > limit:
        raise YouCamError("provider_response", "The try-on service sent an unexpectedly large response.")
    return data


def _classify_400(exc: HTTPError) -> tuple[str, str]:
    try:
        body = json.loads(exc.read(20_000))
        error = body.get("error") if isinstance(body, dict) else None
    except (ValueError, OSError, UnicodeError):
        error = None
    if error == "CreditInsufficiency":
        return "credits", "The try-on account is out of credits."
    return "invalid_request", "The try-on service rejected the request parameters."


def _api(key: str, path: str, payload: dict | None = None) -> dict:
    raw = _request(
        API_BASE + path,
        "POST" if payload is not None else "GET",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json.dumps(payload).encode() if payload is not None else None,
    )
    try:
        result = json.loads(raw)
    except (ValueError, UnicodeError):
        raise YouCamError("provider_response", "The try-on service returned an unreadable response.") from None
    if not isinstance(result, dict) or result.get("status") != 200 or not isinstance(result.get("data"), dict):
        raise YouCamError("provider_response", "The try-on service returned an unexpected response.")
    return result["data"]


def _require_id(data: dict, field: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value or len(value) > 512 or not all(c.isascii() and (c.isalnum() or c in "-_+/=") for c in value):
        raise YouCamError("provider_response", "The try-on service returned an unexpected response.")
    return value


def upload(key: str, content: bytes, filename: str) -> str:
    data = _api(key, "/s2s/v2.0/file", {"files": [
        {"content_type": "image/png", "file_name": filename, "file_size": len(content)},
    ]})
    files = data.get("files")
    if not isinstance(files, list) or len(files) != 1 or not isinstance(files[0], dict):
        raise YouCamError("provider_response", "Unexpected file-registration response.")
    file_id = _require_id(files[0], "file_id")
    requests = files[0].get("requests")
    if not isinstance(requests, list) or len(requests) != 1 or not isinstance(requests[0], dict):
        raise YouCamError("provider_response", "Unexpected upload instructions.")
    signed = requests[0]
    headers = signed.get("headers")
    if signed.get("method") != "PUT" or not isinstance(signed.get("url"), str) or not isinstance(headers, dict):
        raise YouCamError("provider_response", "Unexpected upload instructions.")
    if any(str(k).lower() in {"authorization", "cookie", "proxy-authorization"} for k in headers):
        raise YouCamError("provider_response", "Unexpected upload instructions.")
    # Storage gets only the provider's signed headers — never our API key.
    _request(signed["url"], "PUT", {str(k): str(v) for k, v in headers.items()}, content)
    return file_id


def create_task(key: str, person_png: bytes, garment_png: bytes, category: str) -> str:
    if category not in CATEGORIES:
        raise YouCamError("invalid_category", "This garment type can't be previewed yet.")
    stage = "upload_person"
    try:
        src = upload(key, person_png, "person.png")
        stage = "upload_garment"
        ref = upload(key, garment_png, "garment.png")
        stage = "create_task"
        data = _api(key, TASK_PATH, {"src_file_id": src, "ref_file_id": ref, "garment_category": category})
        return _require_id(data, "task_id")
    except YouCamError as exc:
        exc.stage = stage
        raise


def poll_task(key: str, task_id: str) -> tuple[str, str | None, str | None]:
    """Return (state, result_url, error_code) where state is running|success|error."""
    data = _api(key, f"{TASK_PATH}/{quote(task_id, safe='')}")
    status = data.get("task_status")
    if status == "success":
        results = data.get("results")
        if not isinstance(results, dict) or not isinstance(results.get("url"), str):
            raise YouCamError("provider_response", "The try-on finished but no image was returned.")
        return "success", results["url"], None
    if status == "error" or data.get("error"):
        error = data.get("error")
        return "error", None, error if isinstance(error, str) and _SAFE_CODE.match(error) else "task_error"
    if status == "running":
        return "running", None, None
    raise YouCamError("provider_response", "The try-on service reported an unknown state.")


def download_result(url: str) -> bytes:
    content = _request(url, "GET", {}, limit=MAX_RESULT_BYTES)
    try:
        with Image.open(io.BytesIO(content)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise YouCamError("provider_response", "The try-on result wasn't a valid image.") from None
    return content
