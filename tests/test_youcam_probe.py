"""Offline safety/contract checks. These are NOT evidence of a live API trial."""

import importlib.util
import io
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from urllib.error import HTTPError

from PIL import Image

SPEC = importlib.util.spec_from_file_location("probe", Path(__file__).resolve().parents[1] / "scripts" / "youcam_probe.py")
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class ProbeTests(unittest.TestCase):
    def test_missing_key_prevents_all_network_calls(self):
        with patch.object(probe, "read_config", return_value={}), patch.object(probe, "request_bytes") as network:
            with patch("sys.stderr", new_callable=io.StringIO):
                self.assertEqual(probe.main([]), 2)
            network.assert_not_called()

    def test_default_mode_never_uploads_even_with_valid_inputs(self):
        with patch.object(probe, "preflight", return_value=("private-key", b"person", b"garment", "outer")):
            with patch.object(probe, "request_bytes") as network, patch("sys.stdout", new_callable=io.StringIO) as log:
                self.assertEqual(probe.main([]), 0)
            network.assert_not_called()
            self.assertNotIn("private-key", log.getvalue())

    def test_live_run_requires_consent_before_upload(self):
        with patch.object(probe, "preflight", return_value=("private-key", b"p", b"g", "outer")):
            with patch.object(probe, "request_bytes") as network, patch("sys.stdout", new_callable=io.StringIO), patch("sys.stderr", new_callable=io.StringIO):
                self.assertEqual(probe.main(["--run"]), 2)
            network.assert_not_called()

    def test_budget_guard_stops_before_upload(self):
        with patch.object(probe, "preflight", return_value=("private-key", b"p", b"g", "outer")):
            with patch.object(probe, "request_bytes") as network, patch("sys.stdout", new_callable=io.StringIO), patch("sys.stderr", new_callable=io.StringIO):
                self.assertEqual(probe.main(["--run", "--consent", "--max-units", "1"]), 2)
            network.assert_not_called()

    def test_signed_storage_upload_does_not_receive_api_key(self):
        registration = {"files": [{"file_id": "file-123", "requests": [{
            "method": "PUT", "url": "https://storage.example.test/signed", "headers": {"Content-Type": "image/png"},
        }]}]}
        with patch.object(probe, "api_json", return_value=registration), patch.object(probe, "request_bytes") as storage:
            self.assertEqual(probe.upload_image("very-private-key", b"png", "garment.png"), "file-123")
            self.assertNotIn("very-private-key", repr(storage.call_args))
            self.assertNotIn("Authorization", storage.call_args.args[2])

    def test_terminal_error_does_not_retry_or_generate_again(self):
        with patch.object(probe, "api_json", return_value={"task_status": "error", "error": {"message": "private"}}) as api:
            with self.assertRaises(probe.ProbeError) as caught:
                probe.wait_for_result("secret", "task-123", 30)
            self.assertNotIn("private", str(caught.exception))
            self.assertEqual(api.call_count, 1)
            self.assertEqual(len(api.call_args.args), 2)  # GET only, no creation payload.

    def test_ambiguous_creation_failure_is_never_retried(self):
        with patch.object(probe, "preflight", return_value=("key", b"p", b"g", "outer")):
            with patch.object(probe, "upload_image", side_effect=["src-1", "ref-1"]):
                with patch.object(probe, "api_json", side_effect=probe.ProbeError("Network failed")) as api:
                    with patch("sys.stdout", new_callable=io.StringIO), patch("sys.stderr", new_callable=io.StringIO):
                        self.assertEqual(probe.main(["--run", "--consent"]), 2)
                    self.assertEqual(api.call_count, 1)

    def test_malformed_success_is_not_accepted(self):
        with patch.object(probe, "api_json", return_value={"task_status": "success", "results": None}):
            with self.assertRaises(probe.ProbeError):
                probe.wait_for_result("secret", "task-123", 30)

    def test_http_errors_do_not_disclose_signed_url_or_body(self):
        error = HTTPError("https://example.test?secret=private", 401, "private", {}, io.BytesIO(b"private response"))
        with patch.object(probe, "build_opener") as opener:
            opener.return_value.open.side_effect = error
            with self.assertRaises(probe.ProbeError) as caught:
                probe.request_bytes("https://example.test", "GET", {})
            self.assertEqual(str(caught.exception), "HTTP 401. Check the API key locally.")

    def test_plain_http_storage_url_is_rejected_before_network(self):
        with patch.object(probe, "build_opener") as opener:
            with self.assertRaises(probe.ProbeError):
                probe.request_bytes("http://example.test/image", "GET", {})
            opener.assert_not_called()

    def test_image_metadata_is_removed_from_upload(self):
        with TemporaryDirectory() as tmp:
            source = Path(tmp) / "person.jpg"
            exif = Image.Exif()
            exif[315] = "Personal name"
            Image.new("RGB", (768, 1024), "white").save(source, exif=exif)
            output = probe.prepare_image(source)
            with Image.open(io.BytesIO(output)) as uploaded:
                self.assertEqual(uploaded.format, "PNG")
                self.assertFalse(uploaded.getexif())

    def test_small_and_corrupt_images_are_rejected(self):
        with TemporaryDirectory() as tmp:
            source = Path(tmp) / "garment.png"
            Image.new("RGB", (128, 128), "red").save(source)
            with self.assertRaises(probe.ProbeError):
                probe.prepare_image(source)
            source.write_bytes(b"not an image")
            with self.assertRaises(probe.ProbeError):
                probe.prepare_image(source)


if __name__ == "__main__":
    unittest.main()
