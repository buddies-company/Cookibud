"""MongoDB implementation of RecipeRepository"""

from adapters.mongodb.crud import CRUD
from adapters.ports.recipe_repository import RecipeRepository as IRecipeRepository
from entities.recipe import Recipe


class RecipeRepository(CRUD, IRecipeRepository):
    """Repository to handle recipes"""

    def __init__(self, uri: str):
        super().__init__(uri, "Recipes", class_type=Recipe)
