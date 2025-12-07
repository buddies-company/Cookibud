"""Meal entity definition."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class RecipeEntry(BaseModel):
    """Entry of a recipe in a meal, with servings"""

    recipe_id: str
    title: Optional[str] = None
    servings: int = 1


class Meal(BaseModel):
    """Meal definition: a date with one or more recipe entries and servings"""

    id: Optional[str] = None
    date: str  # ISO format date string
    items: List[RecipeEntry]
    user_id: str | None = None  # owner of this meal

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "date": "2025-11-15",
                "recipes": [
                    {"recipe_id": "abc123", "title": "Pancakes", "servings": 4}
                ],
            }
        }
    )
