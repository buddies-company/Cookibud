"""Recipe entity definition module"""

from pydantic import BaseModel


class Ingredient(BaseModel):
    """Ingredient definition"""

    name: str
    quantity: float | None = None  # in grams


class Recipe(BaseModel):
    """Recipe definition"""

    id: str | None = None
    title: str
    description: str | None = None
    ingredients: list[Ingredient]  # ingredient name to quantity in g mapping
    prep_time: int | None = None  # in minutes
    cook_time: int | None = None  # in minutes
    author_id: str | None = None  # user who created this recipe
    children: list["Recipe"] = []
    tags: list[str] = []
