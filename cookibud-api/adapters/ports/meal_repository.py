from abc import ABC

from adapters.ports.crud import CRUD


class MealRepository(CRUD, ABC):
    """Repository to handle meals"""
