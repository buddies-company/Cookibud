"""Meal management use cases"""

from dataclasses import dataclass

from adapters.ports.meal_repository import MealRepository
from entities.meal import Meal, RecipeEntry
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
        return self.meal_repository.update(
            meal_id,
            **meal_data.model_dump(exclude_unset=True, exclude={"user_id", "id"})
        )


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


@dataclass
class AddRecipeToMealUseCase:
    """Append a recipe entry to an existing meal (ownership verified)"""

    meal_repository: MealRepository

    def __call__(self, meal_id: str, recipe_entry: dict, user_id: str):
        existing = self.meal_repository.read(id=meal_id, user_id=user_id)
        if not existing:
            raise AccessDeniedError(MEAL_NOT_FOUND_OR_DENIED)
        meal = existing[0]
        items = list(meal.items or [])
        # ensure recipe_entry is a RecipeEntry instance
        if isinstance(recipe_entry, dict):
            recipe_entry_obj = RecipeEntry(**recipe_entry)
        elif isinstance(recipe_entry, RecipeEntry):
            recipe_entry_obj = recipe_entry
        else:
            raise ValueError("Invalid recipe entry")
        items.append(recipe_entry_obj)
        meal.items = items
        return self.meal_repository.update(meal_id, **meal.model_dump(exclude_unset=True, exclude={"id", "user_id"}))


@dataclass
class RemoveRecipeFromMealUseCase:
    """Remove a recipe entry (by recipe_id) from an existing meal"""

    meal_repository: MealRepository

    def __call__(self, meal_id: str, recipe_id: str, user_id: str):
        existing = self.meal_repository.read(id=meal_id, user_id=user_id)
        if not existing:
            raise AccessDeniedError(MEAL_NOT_FOUND_OR_DENIED)
        meal = existing[0]
        # normalize items into RecipeEntry objects for consistent handling
        items_objs = []
        for it in (meal.items or []):
            if isinstance(it, dict):
                items_objs.append(RecipeEntry(**it))
            elif isinstance(it, RecipeEntry):
                items_objs.append(it)
            else:
                # unexpected type, keep as-is
                items_objs.append(it)
        items = [it for it in items_objs if it.recipe_id != recipe_id]
        meal.items = items
        return self.meal_repository.update(meal_id, **meal.model_dump(exclude_unset=True, exclude={"id", "user_id"}))


@dataclass
class PlanRecipeUseCase:
    """Plan a recipe for a date: create or append to a meal for that date"""

    meal_repository: MealRepository

    def __call__(self, date_iso: str, recipe_entry: dict, user_id: str):
        # find existing meal for date and user
        meals = self.meal_repository.read(date=date_iso, user_id=user_id)
        if meals:
            meal = meals[0]
            items = list(meal.items or [])
            # ensure entry is RecipeEntry
            if isinstance(recipe_entry, dict):
                entry_obj = RecipeEntry(**recipe_entry)
            elif isinstance(recipe_entry, RecipeEntry):
                entry_obj = recipe_entry
            else:
                raise ValueError("Invalid recipe entry")
            items.append(entry_obj)
            meal.items = items
            return self.meal_repository.update(meal.id, **meal.model_dump(exclude_unset=True, exclude={"id", "user_id"}))
        # create a new meal for this date
        # convert entry to RecipeEntry model
        if isinstance(recipe_entry, dict):
            entry_obj = RecipeEntry(**recipe_entry)
        elif isinstance(recipe_entry, RecipeEntry):
            entry_obj = recipe_entry
        else:
            raise ValueError("Invalid recipe entry")
        meal = Meal(date=date_iso, items=[entry_obj], user_id=user_id)
        return self.meal_repository.create(meal)
