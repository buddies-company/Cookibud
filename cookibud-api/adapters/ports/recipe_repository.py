from abc import ABC

from adapters.ports.crud import CRUD


class RecipeRepository(CRUD, ABC):
    """Repository to handle recipes"""
