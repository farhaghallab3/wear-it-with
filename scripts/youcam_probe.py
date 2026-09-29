"""One real Clothes V4 trial. Default mode is local preflight, with no network.

Contract: https://docs.perfectcorp.com/reference/ai_clothes/section/overview/integration-guide
Schema: https://docs.perfectcorp.com/reference/ai_clothes/v4.0
Prepared 2026-09-28; pre-submission preparation must be disclosed in the entry.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
API_BASE = "https://yce-api-01.makeupar.com"
TASK_PATH = "/s2s/v2.0/task/cloth-v4"
MAX_IMAGE_BYTES = 10_000_000
DOCUMENTED_UNITS = 2  # Official V4 announcement, verified 2026-09-28; recheck console.


class ProbeError(Exception):
    """Safe error text: never embed provider bodies, keys, or signed URLs."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_config() -> dict[str, str]:
    values = {}
    env_file = ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            name, sep, value = line.partition("=")
            if sep and name.strip().startswith("YOUCAM_"):
                values[name.strip()] = value.strip().strip("\"'")
    values.update({k: v for k, v in os.environ.items() if k.startswith("YOUCAM_")})
    return values


def prepare_image(path: Path) -> bytes:
    if not path.is_file():
        raise ProbeError("Image file is missing. Check its path in .env.local.")
    if path.stat().st_size >= MAX_IMAGE_BYTES:
        raise ProbeError("Input image must be smaller than 10,000,000 bytes.")
    try:
        with Image.open(path) as original:
            if original.format not in {"JPEG", "PNG"}:
                raise ProbeError("Only JPEG and PNG inputs are accepted by this probe.")
            short, long = sorted(original.size)
            if short < 384 or long < 512 or long > 4096:
                raise ProbeError("Use short side >=384px, long side 512..4096px.")
            # Correct phone orientation, then explicitly remove EXIF and other metadata.
            normalized = ImageOps.exif_transpose(original).convert("RGB")
            normalized.info.clear()
            output = io.BytesIO()
            normalized.save(output, format="PNG")
            content = output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise ProbeError("Cannot decode the image. Export a valid JPEG or PNG.") from None
    if len(content) >= MAX_IMAGE_BYTES:
        raise ProbeError("Normalized PNG exceeds the upload limit; resize the source first.")
    return content


def preflight(config: dict[str, str]) -> tuple[str, bytes, bytes, str]:
    key = config.get("YOUCAM_API_KEY", "").strip()
    if not key or key.lower() in {"your_api_key", "replace_me", "paste_here"}:
        raise ProbeError("YOUCAM_API_KEY is missing. Set it locally in .env.local.")
    if not key.isascii() or any(ord(c) < 33 or ord(c) > 126 for c in key):
        raise ProbeError("API key contains invalid characters. Copy it again locally.")
    category = config.get("YOUCAM_GARMENT_CATEGORY", "outer")
    if category not in {"outer", "upper_body"}:
        raise ProbeError("This initial probe supports outer or upper_body only.")
    images = []
    for name in ("YOUCAM_PERSON_IMAGE", "YOUCAM_GARMENT_IMAGE"):
        value = config.get(name, "").strip()
        if not value:
            raise ProbeError(f"{name} is missing in .env.local.")
        path = Path(value)
        images.append(prepare_image(path if path.is_absolute() else ROOT / path))
    return key, images[0], images[1], category


def request_bytes(url: str, method: str, headers: dict, body=None, limit=MAX_IMAGE_BYTES) -> bytes:
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        raise ProbeError("Provider returned an invalid HTTPS URL.")
    req = Request(url, data=body, headers=headers, method=method)
    try:
        with build_opener(NoRedirect()).open(req, timeout=30) as response:
            result = response.read(limit + 1)
    except HTTPError as exc:
        guidance = {
            401: "Check the API key locally.", 403: "Check API access and image permissions.",
            413: "Image is too large.", 429: "Rate limited; do not recreate the task automatically.",
        }.get(exc.code, "Check the provider console; no automatic retry was performed.")
        raise ProbeError(f"HTTP {exc.code}. {guidance}") from None
    except (URLError, TimeoutError, OSError):
        raise ProbeError("Network failed. A submitted task may still exist; check the console before rerunning.") from None
    if len(result) > limit:
        raise ProbeError("Provider response exceeded this probe's size limit.")
    return result


def api_json(key: str, path: str, payload=None) -> dict:
    if not path.startswith("/s2s/v2.0/"):
        raise ProbeError("Unexpected API path.")
    raw = request_bytes(
        API_BASE + path, "POST" if payload is not None else "GET",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json.dumps(payload).encode() if payload is not None else None, limit=1_000_000,
    )
    try:
        result = json.loads(raw)
    except (ValueError, UnicodeError):
        raise ProbeError("API returned invalid JSON; response content was not logged.") from None
    if not isinstance(result, dict) or result.get("status") != 200 or not isinstance(result.get("data"), dict):
        raise ProbeError("Unexpected API response. Check the provider console; response content was not logged.")
    return result["data"]


def require_id(data: dict, field: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value or len(value) > 512 or not all(c.isascii() and (c.isalnum() or c in "-_+/=") for c in value):
        raise ProbeError(f"Missing or invalid {field} in API response.")
    return value


def upload_image(key: str, content: bytes, filename: str) -> str:
    data = api_json(key, "/s2s/v2.0/file", {"files": [{
        "content_type": "image/png", "file_name": filename, "file_size": len(content),
    }]})
    files = data.get("files")
    if not isinstance(files, list) or len(files) != 1 or not isinstance(files[0], dict):
        raise ProbeError("Unexpected file-registration response.")
    file = files[0]
    file_id = require_id(file, "file_id")
    uploads = file.get("requests")
    if not isinstance(uploads, list) or len(uploads) != 1 or not isinstance(uploads[0], dict):
        raise ProbeError("Expected one signed upload request.")
    upload = uploads[0]
    headers = upload.get("headers")
    if upload.get("method") != "PUT" or not isinstance(upload.get("url"), str) or not isinstance(headers, dict):
        raise ProbeError("Unexpected signed upload method, URL, or headers.")
    if any(k.lower() in {"authorization", "cookie", "proxy-authorization"} for k in headers):
        raise ProbeError("Unexpected authentication header on storage upload.")
    # Only the provider's signed upload headers go to storage. Never the API key.
    request_bytes(upload["url"], "PUT", headers, content, limit=1_000_000)
    return file_id


def wait_for_result(key: str, task_id: str, timeout: int) -> str:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        data = api_json(key, f"{TASK_PATH}/{quote(task_id, safe='')}")
        status = data.get("task_status")
        if status == "success":
            results = data.get("results")
            if not isinstance(results, dict) or not isinstance(results.get("url"), str):
                raise ProbeError("Task succeeded but result URL is missing.")
            return results["url"]
        if status == "error" or data.get("error"):
            raise ProbeError("YouCam reported a task error. Check the console for this task; no new task was created.")
        if status != "running":
            raise ProbeError("Unrecognized task state. Check the console before resubmitting.")
        print("Task running; waiting 10 seconds...")
        time.sleep(min(10, max(0, deadline - time.monotonic())))
    raise ProbeError("Polling timed out; the task may still finish. Save its ID and check the console before rerunning.")


def save_result(content: bytes, task_id: str, category: str) -> Path:
    folder = ROOT / "artifacts" / "youcam-smoke" / task_id
    try:
        with Image.open(io.BytesIO(content)) as result:
            result.load()
            normalized = result.convert("RGB")
            normalized.info.clear()
    except (OSError, ValueError, Image.DecompressionBombError):
        raise ProbeError("Result was not a decodable image; no successful artifact was recorded.") from None
    folder.mkdir(parents=True, exist_ok=True)
    normalized.save(folder / "result.png", format="PNG")
    (folder / "run.json").write_text(json.dumps({
        "source": "real_youcam_api", "endpoint": TASK_PATH, "task_id": task_id,
        "category": category, "completed_at": datetime.now(timezone.utc).isoformat(),
        "documented_units_per_image": DOCUMENTED_UNITS,
        "billing_verified": False,
    }, indent=2), encoding="utf-8")
    return folder / "result.png"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", action="store_true", help="Upload photos and create ONE real, unit-consuming task.")
    parser.add_argument("--consent", action="store_true", help="Confirm photo rights and consent to sending them to YouCam.")
    parser.add_argument("--max-units", type=int, default=2, help="Local guard against the documented estimate, not an account billing cap.")
    parser.add_argument("--timeout", type=int, default=180, help="Polling timeout in seconds.")
    args = parser.parse_args(argv)
    try:
        key, person, garment, category = preflight(read_config())
        print(f"Local preflight passed: two valid images; category={category}; key present (not authenticated).")
        if not args.run:
            print("No network requests, uploads, or units consumed. Use --run --consent for a real trial.")
            return 0
        if not args.consent:
            raise ProbeError("Real trial requires --consent: images will be sent to YouCam for processing.")
        if args.max_units < DOCUMENTED_UNITS or args.timeout < 10:
            raise ProbeError("Allow at least 2 documented units and a polling timeout >=10 seconds.")
        print("Creating at most one task. Documented estimate: 2 units/image; verify credits and current rate in console.")
        src = upload_image(key, person, "person.png")
        ref = upload_image(key, garment, "garment.png")
        data = api_json(key, TASK_PATH, {"src_file_id": src, "ref_file_id": ref, "garment_category": category})
        task_id = require_id(data, "task_id")
        print(f"Created task: {task_id} (keep this ID if polling is interrupted).")
        result_url = wait_for_result(key, task_id, args.timeout)
        output = save_result(request_bytes(result_url, "GET", {}, limit=25_000_000), task_id, category)
        print(f"Real API result saved locally: {output}")
        print("Visual quality and billing still require review. This preview does not establish fit or size accuracy.")
        return 0
    except ProbeError as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("Stopped. Any created provider task may continue; do not recreate it blindly.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
