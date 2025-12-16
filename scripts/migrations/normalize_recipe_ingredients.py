"""Migration script to normalize ingredient quantities in existing recipes.

Run with:
  python scripts/migrations/normalize_recipe_ingredients.py

It will iterate over Recipes collection and replace ingredient.quantity with normalized
values in grams/ml (or keep as count for piece-based items) and set ingredient.unit.
"""

from adapters.mongodb.db import Collection
from drivers.config import settings
from use_cases.units import normalize_unit_and_qty
from bson import ObjectId


def migrate(uri: str):
    with Collection(uri, "Recipes") as coll:
        for doc in coll.find({}):
            needs_update = False
            ingredients = doc.get("ingredients") or []
            new_ings = []
            for ing in ingredients:
                # ing may be dict or structure; ensure we handle both
                name = ing.get("name")
                qty = ing.get("quantity")
                unit = ing.get("unit") or None
                # If quantity is a string, attempt to parse using regex
                if isinstance(qty, str):
                    import re

                    m = re.match(r"^\s*(\d*\.?\d+)\s*(.*)$", qty)
                    if m:
                        qty_val = float(m.group(1))
                        unit = m.group(2).strip() or None
                    else:
                        qty_val = None
                else:
                    qty_val = qty

                normalized_qty, normalized_unit = normalize_unit_and_qty(qty_val, unit)
                if normalized_qty != qty or (unit and normalized_unit != unit):
                    needs_update = True
                new_ing = dict(ing)
                new_ing["quantity"] = normalized_qty
                new_ing["unit"] = normalized_unit
                new_ings.append(new_ing)

            if needs_update:
                coll.update_one(
                    {"_id": doc["_id"]}, {"$set": {"ingredients": new_ings}}
                )
                print(f"Updated recipe {doc.get('_id')} with normalized ingredients")


if __name__ == "__main__":
    migrate(settings.mongo_uri)
