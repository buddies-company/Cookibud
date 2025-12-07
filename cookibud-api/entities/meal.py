from typing import List, Optional

from pydantic import BaseModel


class RecipeEntry(BaseModel):
    recipe_id: str
    title: Optional[str] = None
    servings: int = 1


class Meal(BaseModel):
    """Meal definition: a date with one or more recipe entries and servings"""

    id: Optional[str] = None
    date: str  # ISO format date string
    items: List[RecipeEntry]
    user_id: str | None = None  # owner of this meal

    class Config:
        schema_extra = {
            "example": {
                "date": "2025-11-15",
                "recipes": [
                    {"recipe_id": "abc123", "title": "Pancakes", "servings": 4}
                ],
            }
        }
