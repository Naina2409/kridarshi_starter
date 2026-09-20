import json

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.utils.translation import activate
from django.views.decorators.http import require_POST
from django.views.i18n import set_language as django_set_language

from .i18n import (
    CATEGORY_KEYS,
    CONDITION_KEYS,
    CROP_KEYS,
    LANG_TO_FARMER,
    TREND_KEYS,
    current_lang,
    tr,
)
from .integrations import get_market_prices, get_weather, synthesize_speech, transcribe_speech
from .models import Farmer, InventoryItem
from .utils import answer_farm_query, estimate_resources, suggest_tools


def _demo_farmer():
    """Hour 7.5-8: for the demo, just use/create one seeded farmer so every page has data."""
    farmer, _ = Farmer.objects.get_or_create(
        name="Ramesh Kumar", defaults={"phone": "+919800000000", "village": "Sonipat"}
    )
    return farmer


def _localize_weather(weather, lang):
    key = CONDITION_KEYS.get((weather.get("condition") or "").lower())
    if key:
        weather = dict(weather)
        weather["condition"] = tr(key, lang)
    return weather


def _localize_prices(prices, lang):
    localized = []
    for price in prices:
        row = dict(price)
        crop_key = CROP_KEYS.get((row.get("crop") or "").lower())
        trend_key = TREND_KEYS.get((row.get("trend") or "").lower())
        if crop_key:
            row["crop"] = tr(crop_key, lang)
        if trend_key:
            row["trend"] = tr(trend_key, lang)
        localized.append(row)
    return localized


def _dashboard_speech(farmer, weather, low_stock, expiring, lang):
    parts = [
        tr(
            "speech_intro",
            lang,
            name=farmer.name,
            village=farmer.village,
            temp=weather.get("temp_c"),
            condition=weather.get("condition"),
        )
    ]
    if not low_stock and not expiring:
        parts.append(tr("speech_no_alerts", lang))
    if low_stock:
        parts.append(tr("speech_low", lang, names=", ".join(i.name for i in low_stock)))
    if expiring:
        parts.append(tr("speech_expiring", lang, names=", ".join(i.name for i in expiring)))
    return " ".join(parts)


def dashboard(request):
    """Hour 6.5-7.5: the single screen judges will actually look at.
    Everything below pulls from the modules built in earlier hours."""
    farmer = _demo_farmer()
    lang = current_lang()
    items = farmer.inventory.all()
    low_stock = [i for i in items if i.is_low_stock]
    expiring = [i for i in items if i.is_expiring_soon]
    weather = _localize_weather(get_weather(lat=28.99, lon=77.02), lang)
    prices = _localize_prices(get_market_prices(), lang)
    estimate = estimate_resources(crop="wheat", season="rabi", acres=2)
    tool_suggestions = suggest_tools([i.name for i in items], lang)
    inventory_rows = [
        {
            "item": i,
            "category_label": tr(CATEGORY_KEYS[i.category], lang) if i.category in CATEGORY_KEYS else i.category,
        }
        for i in items
    ]

    context = {
        "farmer": farmer,
        "items": items,
        "inventory_rows": inventory_rows,
        "low_stock": low_stock,
        "expiring": expiring,
        "weather": weather,
        "prices": prices,
        "estimate": estimate,
        "estimate_seed": tr("seed", lang, kg=estimate["seed_kg"]) if estimate.get("found") else "",
        "estimate_fertilizer": tr("fertilizer", lang, value=estimate.get("fertilizer_kg")) if estimate.get("found") else "",
        "estimate_water": tr("water", lang, liters=estimate["water_liters_per_day"]) if estimate.get("found") else "",
        "tool_suggestions": tool_suggestions,
        "welcome_text": tr("welcome", lang, name=farmer.name, village=farmer.village),
        "low_stock_msgs": [
            tr("low_stock_item", lang, name=i.name, quantity=i.quantity, unit=i.unit) for i in low_stock
        ],
        "expiring_msgs": [
            tr("expiring_item", lang, name=i.name, days=i.days_to_expiry) for i in expiring
        ],
        "speech_text": _dashboard_speech(farmer, weather, low_stock, expiring, lang),
    }
    return render(request, "farm/dashboard.html", context)


def inventory_list(request):
    farmer = _demo_farmer()
    lang = current_lang()
    return render(
        request,
        "farm/inventory_list.html",
        {
            "inventory_rows": [
                {
                    "item": i,
                    "category_label": tr(CATEGORY_KEYS[i.category], lang) if i.category in CATEGORY_KEYS else i.category,
                }
                for i in farmer.inventory.all()
            ],
        },
    )


def inventory_add(request):
    farmer = _demo_farmer()
    if request.method == "POST":
        InventoryItem.objects.create(
            farmer=farmer,
            name=request.POST["name"],
            category=request.POST["category"],
            quantity=request.POST["quantity"],
            unit=request.POST.get("unit", "kg"),
            low_stock_threshold=request.POST.get("low_stock_threshold", 5),
            expiry_date=request.POST.get("expiry_date") or None,
        )
        return redirect("inventory_list")
    return render(request, "farm/inventory_form.html")


def query_view(request):
    farmer = _demo_farmer()
    lang = current_lang()
    answer = None
    question = ""
    if request.method == "POST":
        question = request.POST.get("question", "")
        answer = answer_farm_query(farmer, question, lang)
    return render(request, "farm/query.html", {"answer": answer, "question": question})


@require_POST
def set_ui_language(request):
    lang = (request.POST.get("language") or "en")[:8]
    activate(lang)
    farmer = _demo_farmer()
    farmer.preferred_language = LANG_TO_FARMER.get(current_lang(lang), farmer.preferred_language)
    farmer.save(update_fields=["preferred_language"])
    return django_set_language(request)


@require_POST
def voice_speak(request):
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        payload = {}
    text = (payload.get("text") or request.POST.get("text") or "").strip()
    if not text:
        return JsonResponse({"error": "empty"}, status=400)
    audio, err = synthesize_speech(text)
    if err == "missing_key":
        return JsonResponse({"error": "missing_key"}, status=503)
    if not audio:
        return JsonResponse({"error": err or "tts_failed"}, status=502)
    return HttpResponse(audio, content_type="audio/mpeg")


@require_POST
def voice_transcribe(request):
    audio = request.FILES.get("audio")
    if not audio:
        return JsonResponse({"error": "empty"}, status=400)
    text, err = transcribe_speech(
        audio.read(),
        audio.name,
        audio.content_type or "application/octet-stream",
        "",
    )
    if err == "missing_key":
        return JsonResponse({"error": "missing_key"}, status=503)
    if err or not text:
        return JsonResponse({"error": err or "stt_failed"}, status=502)
    return JsonResponse({"text": text})
