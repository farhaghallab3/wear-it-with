"""Offline tests with the provider mocked. These are NOT evidence of a live API call."""

import io
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from . import youcam
from .models import TryOn

HEADERS = {"HTTP_X_REQUESTED_WITH": "fetch"}


def png(size=(768, 1024)) -> bytes:
    out = io.BytesIO()
    Image.new("RGB", size, "white").save(out, format="PNG")
    return out.getvalue()


def form(**overrides):
    data = {
        "person": SimpleUploadedFile("p.png", png(), "image/png"),
        "garment": SimpleUploadedFile("g.png", png(), "image/png"),
        "category": "outer",
        "consent": "true",
    }
    data.update(overrides)
    return data


@override_settings(YOUCAM_API_KEY="test-key", TRYON_SESSION_LIMIT=2, TRYON_DAILY_LIMIT=10)
class TryOnApiTests(TestCase):
    def test_config_reports_enabled_without_leaking_key(self):
        body = self.client.get("/api/config").content.decode()
        self.assertIn('"tryon_enabled":true', body)
        self.assertNotIn("test-key", body)

    @override_settings(YOUCAM_API_KEY="")
    def test_not_configured_makes_no_network_call(self):
        with patch.object(youcam, "_request") as network:
            response = self.client.post("/api/tryons", form(), **HEADERS)
        self.assertEqual(response.status_code, 503)
        network.assert_not_called()

    def test_requires_custom_header(self):
        with patch.object(youcam, "_request") as network:
            self.assertEqual(self.client.post("/api/tryons", form()).status_code, 400)
        network.assert_not_called()

    def test_requires_consent(self):
        with patch.object(youcam, "_request") as network:
            response = self.client.post("/api/tryons", form(consent="false"), **HEADERS)
        self.assertEqual(response.json()["error"]["code"], "consent_required")
        network.assert_not_called()

    def test_small_image_rejected_before_spending(self):
        small = SimpleUploadedFile("p.png", png((200, 200)), "image/png")
        with patch.object(youcam, "_request") as network:
            response = self.client.post("/api/tryons", form(person=small), **HEADERS)
        self.assertEqual(response.json()["error"]["code"], "image_dimensions")
        network.assert_not_called()

    def test_create_poll_success_and_session_ownership(self):
        with patch.object(youcam, "create_task", return_value="task-1") as create:
            response = self.client.post("/api/tryons", form(), **HEADERS)
        self.assertEqual(response.status_code, 201)
        create.assert_called_once()
        tryon_id = response.json()["id"]

        with patch.object(youcam, "poll_task", return_value=("success", "https://signed.example/r.png", None)):
            self.assertEqual(self.client.get(f"/api/tryons/{tryon_id}").json()["state"], "success")
        self.assertNotIn("signed.example", self.client.get(f"/api/tryons/{tryon_id}").content.decode())

        with patch.object(youcam, "download_result", return_value=png()):
            image = self.client.get(f"/api/tryons/{tryon_id}/image")
        self.assertEqual(image["Content-Type"], "image/png")
        self.assertEqual(image["Cache-Control"], "no-store")

        other = self.client_class()
        self.assertEqual(other.get(f"/api/tryons/{tryon_id}").status_code, 404)

    def test_one_running_task_per_session_and_session_limit(self):
        with patch.object(youcam, "create_task", return_value="task-1"):
            self.client.post("/api/tryons", form(), **HEADERS)
            self.assertEqual(self.client.post("/api/tryons", form(), **HEADERS).status_code, 409)
        TryOn.objects.update(state=TryOn.SUCCESS)
        with patch.object(youcam, "create_task", return_value="task-2"):
            self.client.post("/api/tryons", form(), **HEADERS)
        TryOn.objects.update(state=TryOn.SUCCESS)
        with patch.object(youcam, "create_task") as create:
            self.assertEqual(self.client.post("/api/tryons", form(), **HEADERS).status_code, 429)
        create.assert_not_called()

    def test_ambiguous_network_failure_is_not_retried(self):
        with patch.object(youcam, "create_task", side_effect=youcam.YouCamError("network", "x", True)) as create:
            response = self.client.post("/api/tryons", form(), **HEADERS)
        self.assertEqual(response.json()["error"]["code"], "network")
        create.assert_called_once()

    def test_task_error_is_reported_with_hint(self):
        with patch.object(youcam, "create_task", return_value="task-1"):
            tryon_id = self.client.post("/api/tryons", form(), **HEADERS).json()["id"]
        with patch.object(youcam, "poll_task", return_value=("error", None, "error_pose")):
            body = self.client.get(f"/api/tryons/{tryon_id}").json()
        self.assertEqual(body["state"], "error")
        self.assertEqual(body["error"]["code"], "error_pose")
        self.assertIn("front-facing", body["error"]["hint"])


class ProviderIdTests(TestCase):
    def test_accepts_documented_base64_file_ids(self):
        # Example from the official integration guide contains '/' and '+'.
        documented = "SaGaqpDgKwFrVBgMpQMA3HY0LeqdT9/13W5TOD8/u/FfjK3xgCQ+hRt9MJXBFaud"
        self.assertEqual(youcam._require_id({"file_id": documented}, "file_id"), documented)

    def test_rejects_ids_with_whitespace_or_control_chars(self):
        for bad in ["", "a b", "a\nb", "x" * 600, None]:
            with self.assertRaises(youcam.YouCamError):
                youcam._require_id({"file_id": bad}, "file_id")

    def test_task_id_is_url_quoted_in_poll_path(self):
        with patch.object(youcam, "_api", return_value={"task_status": "running"}) as api:
            youcam.poll_task("k", "a/b+c")
        self.assertEqual(api.call_args.args[1], f"{youcam.TASK_PATH}/a%2Fb%2Bc")


class PrepareImageTests(TestCase):
    def test_strips_exif_and_outputs_png(self):
        out = io.BytesIO()
        image = Image.new("RGB", (768, 1024), "white")
        exif = Image.Exif()
        exif[0x010F] = "SecretCamera"
        image.save(out, format="JPEG", exif=exif)
        result = youcam.prepare_image(out.getvalue(), "your")
        self.assertTrue(result.startswith(b"\x89PNG"))
        self.assertNotIn(b"SecretCamera", result)

    def test_rejects_non_image(self):
        with self.assertRaises(youcam.YouCamError):
            youcam.prepare_image(b"not an image", "your")
