import uuid

from django.db import models


class TryOn(models.Model):
    """One provider task. No person photo is stored — only the task reference and outcome."""

    RUNNING, SUCCESS, ERROR, CLEARED = "running", "success", "error", "cleared"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_key = models.CharField(max_length=64, db_index=True)
    provider_task_id = models.CharField(max_length=128)
    category = models.CharField(max_length=16)
    state = models.CharField(max_length=16, default=RUNNING)
    error_code = models.CharField(max_length=64, blank=True)
    # Signed provider URL, valid ~2 hours per docs. Cleared on request.
    result_url = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_polled_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
