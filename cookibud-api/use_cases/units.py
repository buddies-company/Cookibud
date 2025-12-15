"""Unit normalization utilities used across use_cases."""

from typing import Tuple


def normalize_unit_and_qty(
    qty: float | None, unit: str | None
) -> Tuple[float | None, str | None]:
    """Normalize qty and unit to a base unit.

    - Weight units -> grams (g)
    - Volume units -> milliliters (ml)
    - Pieces -> no unit ('')
    Returns: (normalized_qty, normalized_unit)
    """
    if qty is None:
        return None, unit or ""
    if not unit:
        return qty, ""
    u = unit.strip().lower()
    aliases = {
        "kilogram": "kg",
        "kilograms": "kg",
        "kg": "kg",
        "g": "g",
        "gram": "g",
        "grams": "g",
        "l": "l",
        "liter": "l",
        "litre": "l",
        "ml": "ml",
        "milliliter": "ml",
        "millilitre": "ml",
        "tbsp": "tbsp",
        "tablespoon": "tbsp",
        "tablespoons": "tbsp",
        "tsp": "tsp",
        "teaspoon": "tsp",
        "teaspoons": "tsp",
        "cup": "cup",
        "cups": "cup",
        "pcs": "pc",
        "pc": "pc",
        "piece": "pc",
        "pieces": "pc",
    }
    mapped = aliases.get(u, u)

    weight = {"kg": 1000, "g": 1, "mg": 0.001}
    volume = {"l": 1000, "ml": 1, "tbsp": 15, "tsp": 5, "cup": 240}
    if mapped in weight:
        normalized_qty = float(qty) * weight[mapped]
        return normalized_qty, "g"
    if mapped in volume:
        normalized_qty = float(qty) * volume[mapped]
        return normalized_qty, "ml"
    if mapped == "pc":
        return float(qty), ""
    # default: preserve unit but lowercase
    return float(qty), mapped
