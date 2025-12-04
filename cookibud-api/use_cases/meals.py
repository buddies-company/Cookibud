"""Meal management use cases"""

from dataclasses import dataclass

from adapters.ports.meal_repository import MealRepository
from entities.meal import Meal
from use_cases.exceptions import AccessDeniedError

MEAL_NOT_FOUND_OR_DENIED = "Meal not found or access denied"


@dataclass
class ReadUserMealsUseCase:
    """Retrieve all meals for a specific user"""

    meal_repository: MealRepository

    def __call__(self, user_id: str) -> list[Meal]:
        """Get meals filtered by user_id"""
        return self.meal_repository.read(user_id=user_id)


@dataclass
class ReadMealByIdUseCase:
    """Retrieve a meal by ID with ownership verification"""

    meal_repository: MealRepository

    def __call__(self, meal_id: str, user_id: str) -> Meal:
        """Get meal if owned by user, raise AccessDeniedError otherwise"""
        meals = self.meal_repository.read(id=meal_id, user_id=user_id)
        if not meals:
            raise AccessDeniedError(MEAL_NOT_FOUND_OR_DENIED)
        return meals[0]


@dataclass
class CreateMealUseCase:
    """Create a new meal for the authenticated user"""

    meal_repository: MealRepository

    def __call__(self, meal_data: Meal, user_id: str) -> Meal:
        """Create meal with automatic user_id association"""
        meal_data.user_id = user_id
        return self.meal_repository.create(meal_data)


@dataclass
class UpdateMealUseCase:
    """Update a meal with ownership verification"""

    meal_repository: MealRepository

    def __call__(self, meal_id: str, meal_data: Meal, user_id: str) -> Meal:
        """Update meal if owned by user, raise AccessDeniedError otherwise"""
        existing_meals = self.meal_repository.read(id=meal_id, user_id=user_id)
        if not existing_meals:
            raise AccessDeniedError(MEAL_NOT_FOUND_OR_DENIED)
        return self.meal_repository.update(meal_id, **meal_data)


@dataclass
class DeleteMealUseCase:
    """Delete a meal with ownership verification"""

    meal_repository: MealRepository

    def __call__(self, meal_id: str, user_id: str) -> None:
        """Delete meal if owned by user, raise AccessDeniedError otherwise"""
        existing_meals = self.meal_repository.read(id=meal_id, user_id=user_id)
        if not existing_meals:
            raise AccessDeniedError(MEAL_NOT_FOUND_OR_DENIED)
        self.meal_repository.delete(existing_meals[0])
