from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("inventory/", views.inventory_list, name="inventory_list"),
    path("inventory/add/", views.inventory_add, name="inventory_add"),
    path("query/", views.query_view, name="query_view"),
    path("language/", views.set_ui_language, name="set_language"),
    path("voice/speak/", views.voice_speak, name="voice_speak"),
    path("voice/transcribe/", views.voice_transcribe, name="voice_transcribe"),
]
