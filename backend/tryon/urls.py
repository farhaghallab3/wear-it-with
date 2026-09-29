from django.urls import path

from . import views

urlpatterns = [
    path("config", views.config_view),
    path("tryons", views.create_tryon),
    path("tryons/<uuid:tryon_id>", views.tryon_detail),
    path("tryons/<uuid:tryon_id>/image", views.tryon_image),
]
