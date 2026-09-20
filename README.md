# KriDarshi — hackathon starter (Django)

This is a working scaffold covering every Kisan.AI feature except AR, mapped
to the 8-hour build plan. Nothing here is fake — it runs — but the "AI" and
"market data" pieces are intentionally simple (lookup tables / static JSON)
so you spend your hours on the demo, not on training models.

## Where each hour's work lives

| Hour | Feature | File(s) |
|---|---|---|
| 0–0.5 | Setup, schema | `kridarshi/settings.py`, `farm/models.py` |
| 0.5–2 | Inventory + expiry tracking | `farm/models.py` (`InventoryItem`), `farm/views.py` (`inventory_list`, `inventory_add`), `farm/templates/farm/inventory_*.html` |
| 2–3.5 | SMS/WhatsApp alerts | `farm/integrations.py` (`send_alert`), `farm/management/commands/check_alerts.py` |
| 2–4 | AI resource estimation | `farm/utils.py` (`RESOURCE_LOOKUP`, `estimate_resources`) |
| 3.5–5 | Weather + market insights | `farm/integrations.py` (`get_weather`, `get_market_prices`), `farm/data/market_prices.json` |
| 5–6 | Interactive farm queries | `farm/utils.py` (`answer_farm_query`), `farm/views.py` (`query_view`), `farm/templates/farm/query.html` |
| 6–6.5 | Tool crafting suggestions | `farm/utils.py` (`TOOL_CRAFTING_RULES`, `suggest_tools`) |
| 6.5–7.5 | Dashboard / UI | `farm/templates/farm/dashboard.html`, `farm/views.py` (`dashboard`) |
| 7.5–8 | Seed data, rehearsal | `farm/views.py` (`_demo_farmer`), Django admin at `/admin/` |

## How to run it

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # fill in keys as you get them, or leave blank for mock mode

python manage.py migrate
python manage.py createsuperuser   # so you can add farmers/inventory via /admin/
python manage.py runserver
```

Visit:
- `/` — the dashboard (this is what you demo to judges)
- `/inventory/add/` — add inventory items
- `/query/` — the chatbot-style query box (type or speak)
- `/admin/` — Django admin, fastest way to seed realistic demo data

Use the language menu in the navbar for English, Hindi, or Punjabi.

Before your demo slot, run:
```bash
python manage.py check_alerts
```
This scans inventory and creates/sends alerts for anything low-stock or
expiring soon — do this once with your seeded demo data so the dashboard
already shows an alert when judges look at it live.

## Where to get the real API keys (do this first, they can take time to approve)

- **Twilio** (SMS/WhatsApp): console.twilio.com → free trial account → use the
  WhatsApp Sandbox (instant, no approval wait) rather than a real WhatsApp
  Business number.
- **ElevenLabs** (voice): elevenlabs.io → API key. Put it in `ELEVENLABS_API_KEY`.
  The dashboard **Listen to summary** button and Ask page **Speak** / **Listen**
  buttons use ElevenLabs TTS + Scribe STT. Leave the key blank and the rest of
  the app still runs; voice buttons tell you the key is missing.
- **OpenWeatherMap**: openweathermap.org/api → free tier API key, usually
  active within minutes.
- **Market prices**: real government mandi data is on `agmarknet.gov.in` but
  its API is not hackathon-friendly to integrate live — the static
  `farm/data/market_prices.json` approach is deliberate; edit that file with
  prices for your demo crops instead of trying to integrate it live.

## Extending after the hackathon

- Swap `RESOURCE_LOOKUP` in `farm/utils.py` for a real trained model behind
  the same `estimate_resources()` signature.
- Swap the keyword-matching in `answer_farm_query()` for an LLM API call —
  the function signature already isolates this so nothing else changes.
- Add OpenCV stock monitoring as a new `farm/vision.py` module once core
  features are stable — don't attempt it inside the same 8 hours as everything else.
