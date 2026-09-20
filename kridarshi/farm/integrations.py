"""
Hour 3.5-5: Weather Intelligence + Market Insights
Hour 2-3.5: Real-time SMS/WhatsApp Alerts

Each function has a mock/fallback path so the demo never breaks if a
third-party API key isn't approved in time or wifi is bad on stage.
"""
import json
import os
from pathlib import Path

import requests
from django.conf import settings

DATA_DIR = Path(__file__).resolve().parent / "data"


def get_weather(lat: float, lon: float) -> dict:
    """Hour 3.5-5: OpenWeatherMap. Falls back to mock data with no API key."""
    if not settings.OPENWEATHER_API_KEY:
        return {"mock": True, "temp_c": 29, "condition": "Partly cloudy", "rain_chance_pct": 20}
    try:
        resp = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"lat": lat, "lon": lon, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "mock": False,
            "temp_c": data["main"]["temp"],
            "condition": data["weather"][0]["description"],
            "rain_chance_pct": None,  # use One Call API for a real forecast/probability
        }
    except Exception:
        return {"mock": True, "temp_c": 29, "condition": "Partly cloudy (fallback)", "rain_chance_pct": 20}


import csv

def get_market_prices(crop: str = None) -> list[dict]:
    path = DATA_DIR / "market_prices.csv"
    prices = []
    with open(path, newline="", encoding="utf-8-sig") as f:  # utf-8-sig strips Excel's hidden BOM character
        reader = csv.DictReader(f)
        # normalize headers: lowercase + stripped, so "Crop", " crop", "CROP" all work
        reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]

        for row in reader:
            row = {k.strip().lower(): v for k, v in row.items()}
            prices.append({
                "crop": row.get("crop") or row.get("commodity") or "Unknown",
                "market": row.get("market") or row.get("mandi") or "Unknown",
                "price_per_quintal": float(row.get("price_per_quintal") or row.get("modal_price") or row.get("price") or 0),
                "trend": row.get("trend", "—"),
                "trader_contact": row.get("trader_contact", "N/A"),
            })
    if crop:
        return [p for p in prices if p["crop"].lower() == crop.lower()]
    return prices

def send_alert(phone: str, message: str) -> bool:
    """
    Hour 2-3.5: Twilio WhatsApp/SMS. Returns False (and logs) instead of crashing
    the demo if credentials aren't set — the alert still gets created in the DB either way.
    """
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN):
        print(f"[MOCK ALERT] to {phone}: {message}")
        return False
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=message,
            from_=settings.TWILIO_WHATSAPP_FROM,
            to=f"whatsapp:{phone}",
        )
        return True
    except Exception as e:
        print(f"[ALERT SEND FAILED] {e}")
        return False


TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
FREE_PLAN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"


def _tts_request(api_key: str, voice_id: str, text: str, model_id: str) -> tuple[bytes | None, str, str]:
    try:
        resp = requests.post(
            TTS_URL.format(voice_id=voice_id),
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={"text": text[:2500], "model_id": model_id},
            timeout=30,
        )
        if resp.ok:
            return resp.content, "", ""
        detail = ""
        try:
            payload = resp.json().get("detail") or {}
            if isinstance(payload, dict):
                detail = payload.get("message") or payload.get("code") or ""
            else:
                detail = str(payload)
        except Exception:
            detail = resp.text[:200]
        print(f"[ELEVENLABS TTS FAILED] {resp.status_code} {detail}")
        return None, "tts_failed", detail
    except Exception as e:
        print(f"[ELEVENLABS TTS FAILED] {e}")
        return None, "tts_failed", str(e)


def synthesize_speech(text: str) -> tuple[bytes | None, str]:
    """ElevenLabs TTS. Returns (audio_bytes, error_message)."""
    api_key = getattr(settings, "ELEVENLABS_API_KEY", "")
    if not api_key:
        return None, "missing_key"
    voice_id = settings.ELEVENLABS_VOICE_ID or FREE_PLAN_VOICE_ID
    model_id = settings.ELEVENLABS_MODEL_ID
    audio, err, detail = _tts_request(api_key, voice_id, text, model_id)
    if audio:
        return audio, ""
    if "library voices" in (detail or "").lower() and voice_id != FREE_PLAN_VOICE_ID:
        audio, err, detail = _tts_request(api_key, FREE_PLAN_VOICE_ID, text, model_id)
        if audio:
            return audio, ""
    return None, err or "tts_failed"


def transcribe_speech(audio_bytes: bytes, filename: str, content_type: str, language_code: str) -> tuple[str, str]:
    """ElevenLabs Scribe STT. Returns (transcript, error_message)."""
    api_key = getattr(settings, "ELEVENLABS_API_KEY", "")
    if not api_key:
        return "", "missing_key"
    try:
        data = {"model_id": "scribe_v2"}
        if language_code:
            data["language_code"] = language_code
        resp = requests.post(
            STT_URL,
            headers={"xi-api-key": api_key},
            files={"file": (filename or "speech.webm", audio_bytes, content_type or "audio/webm")},
            data=data,
            timeout=45,
        )
        resp.raise_for_status()
        payload = resp.json()
        return (payload.get("text") or "").strip(), ""
    except Exception as e:
        body = ""
        if "resp" in locals() and getattr(resp, "text", None):
            body = resp.text[:300]
        print(f"[ELEVENLABS STT FAILED] {e} {body}")
        return "", "stt_failed"
