from django.conf import settings

from .i18n import catalog, current_lang


def i18n(request):
    lang = current_lang()
    return {
        "T": catalog(lang),
        "CURRENT_LANG": lang,
        "SUPPORTED_LANGUAGES": settings.LANGUAGES,
        "VOICE_ENABLED": bool(getattr(settings, "ELEVENLABS_API_KEY", "")),
    }
