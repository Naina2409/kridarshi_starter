"""
Hour 2-4: AI Resource Estimation (rule-based lookup, presented as a 'model')
Hour 6-6.5: Automated Tool Crafting suggestions
Hour 5-6: Interactive Farm Queries (keyword-matching chatbot)

None of this needs a trained ML model to look convincing in a demo.
Wrap it behind clean function names so it reads like a model and can
genuinely be swapped for a real one after the hackathon.
"""

# Hour 2-4: crop -> (season) -> recommended resources per acre.
# Extend this dict with 5-10 crops relevant to your demo region.
RESOURCE_LOOKUP = {
    "wheat": {
        "rabi": {"seed_kg": 40, "fertilizer_kg": {"urea": 50, "dap": 25}, "water_liters_per_day": 4000},
    },
    "rice": {
        "kharif": {"seed_kg": 25, "fertilizer_kg": {"urea": 60, "dap": 30}, "water_liters_per_day": 8000},
    },
    "cotton": {
        "kharif": {"seed_kg": 2, "fertilizer_kg": {"urea": 45, "dap": 20}, "water_liters_per_day": 5000},
    },
    "onion": {
        "rabi": {"seed_kg": 5, "fertilizer_kg": {"urea": 35, "dap": 15}, "water_liters_per_day": 3500},
    },
}


def estimate_resources(crop: str, season: str, soil_type: str = "loam", acres: float = 1.0) -> dict:
    """Returns recommended seed/fertilizer/water needs. Falls back gracefully if crop isn't in the lookup."""
    crop = crop.lower().strip()
    season = season.lower().strip()
    data = RESOURCE_LOOKUP.get(crop, {}).get(season)
    if not data:
        return {
            "found": False,
            "message": f"No estimation data yet for {crop} in {season}. Add it to RESOURCE_LOOKUP in farm/utils.py.",
        }
    scaled = {
        "found": True,
        "crop": crop,
        "season": season,
        "soil_type": soil_type,
        "seed_kg": round(data["seed_kg"] * acres, 1),
        "fertilizer_kg": {k: round(v * acres, 1) for k, v in data["fertilizer_kg"].items()},
        "water_liters_per_day": round(data["water_liters_per_day"] * acres, 0),
    }
    return scaled


# Hour 6-6.5: rule-based "if you have X and Y, you can make Z" suggestions.
TOOL_CRAFTING_RULES = [
    {"needs": {"organic_waste", "compost_bin"}, "key": "tool_compost"},
    {"needs": {"bamboo", "rope"}, "key": "tool_trellis"},
    {"needs": {"plastic_sheet", "wooden_frame"}, "key": "tool_cloche"},
]


def suggest_tools(available_items: list[str], lang: str | None = None) -> list[str]:
    """available_items: lowercase item-name slugs the farmer currently has in inventory."""
    from .i18n import tr

    have = set(x.lower().replace(" ", "_") for x in available_items)
    return [tr(rule["key"], lang) for rule in TOOL_CRAFTING_RULES if rule["needs"].issubset(have)]


def _has_hint(question: str, hints: tuple[str, ...]) -> bool:
    q = question.lower()
    return any(h.lower() in q for h in hints)


def answer_farm_query(farmer, question: str, lang: str | None = None) -> str:
    """
    Hour 5-6: simplest working version — keyword match against the farmer's own inventory.
    Swap the body of this function for an LLM API call later; keep the same signature
    so nothing else in the app has to change.
    """
    from .i18n import EXPIRY_HINTS, STOCK_HINTS, tr

    q = question.lower()
    items = farmer.inventory.all()

    if _has_hint(question, EXPIRY_HINTS):
        expiring = [i for i in items if i.is_expiring_soon]
        if not expiring:
            return tr("query_no_expiry", lang)
        listed = ", ".join(
            tr("query_expiry_item", lang, name=i.name, days=i.days_to_expiry) for i in expiring
        )
        return tr("query_expiry", lang, items=listed)

    if _has_hint(question, STOCK_HINTS):
        low = [i for i in items if i.is_low_stock]
        if not low:
            return tr("query_no_low", lang)
        listed = ", ".join(
            tr("query_low_item", lang, name=i.name, quantity=i.quantity, unit=i.unit) for i in low
        )
        return tr("query_low", lang, items=listed)

    for item in items:
        if item.name.lower() in q:
            return tr("query_have", lang, quantity=item.quantity, unit=item.unit, name=item.name)

    return tr("query_fallback", lang)
