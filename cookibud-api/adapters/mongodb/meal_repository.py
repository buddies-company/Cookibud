"""MongoDB implementation of MealRepository"""

from adapters.mongodb.crud import CRUD
from adapters.ports.meal_repository import MealRepository as IMealRepository
from entities.meal import Meal


class MealRepository(CRUD, IMealRepository):
    """Repository to handle meals"""

    def __init__(self, uri: str):
        super().__init__(uri, "Meals", class_type=Meal)
