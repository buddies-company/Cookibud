"""Recipe entity definition module"""

from pydantic import BaseModel


class Ingredient(BaseModel):
    """Ingredient definition"""

    id: str
    name: str
    quantity: float  # in grams


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

    def __init__(
        self,
        title: str,
        ingredients: list[Ingredient],
        description: str | None = None,
        prep_time: int | None = None,
        cook_time: int | None = None,
        id: str | None = None,
        author_id: str | None = None,
        children: list["Recipe"] = None,
    ) -> None:
        super().__init__(
            title=title,
            ingredients=ingredients,
            description=description,
            prep_time=prep_time,
            cook_time=cook_time,
            id=id,
            author_id=author_id,
            children=children or [],
        )
