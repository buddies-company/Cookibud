"""Unit tests for Meal use cases."""

import unittest
from unittest.mock import MagicMock

from adapters.ports.meal_repository import MealRepository
from entities.meal import Meal, RecipeEntry
from use_cases.exceptions import AccessDeniedError
from use_cases.meals import (
    CreateMealUseCase,
    DeleteMealUseCase,
    ReadMealByIdUseCase,
    ReadUserMealsUseCase,
    UpdateMealUseCase,
    AddRecipeToMealUseCase,
    RemoveRecipeFromMealUseCase,
    PlanRecipeUseCase,
)


class TestReadMealsUseCase(unittest.TestCase):
    """Test reading meals for a user"""

    def setUp(self):
        self.meal_repository = MagicMock(spec=MealRepository)
        self.use_case = ReadUserMealsUseCase(self.meal_repository)

    def test_read_meals(self):
        """Test retrieving meals for a user"""
        user_id = "user123"
        expected_meals = [
            Meal(id="meal1", date="2024-01-01", items=[], user_id=user_id)
        ]
        self.meal_repository.read.return_value = expected_meals

        meals = self.use_case(user_id=user_id)

        self.meal_repository.read.assert_called_once_with(user_id=user_id)
        self.assertEqual(meals, expected_meals)


class TestReadMealByIdUseCase(unittest.TestCase):
    """Test reading a meal by ID with ownership verification"""

    def setUp(self):
        self.meal_repository: MealRepository = MagicMock(spec=MealRepository)
        self.use_case = ReadMealByIdUseCase(self.meal_repository)

    def test_read_meal_by_id_success(self):
        """Test retrieving a meal by ID when access is allowed"""
        meal_id = "meal1"
        user_id = "user123"
        expected_meal = Meal(id=meal_id, date="2024-01-01", items=[], user_id=user_id)
        self.meal_repository.read.return_value = [expected_meal]

        meal = self.use_case(meal_id=meal_id, user_id=user_id)

        self.meal_repository.read.assert_called_once_with(id=meal_id, user_id=user_id)
        self.assertEqual(meal, expected_meal)

    def test_read_meal_by_id_access_denied(self):
        """Test retrieving a meal by ID when access is denied"""
        meal_id = "meal1"
        user_id = "user123"
        self.meal_repository.read.return_value = []

        with self.assertRaises(AccessDeniedError):
            self.use_case(meal_id=meal_id, user_id=user_id)

        self.meal_repository.read.assert_called_once_with(id=meal_id, user_id=user_id)


class TestCreateMealUseCase(unittest.TestCase):
    """Test creating a new meal for a user"""

    def setUp(self):
        self.meal_repository = MagicMock(spec=MealRepository)
        self.use_case = CreateMealUseCase(self.meal_repository)

    def test_create_meal(self):
        """Test creating a meal"""
        user_id = "user123"
        meal_data = Meal(date="2024-01-01", items=[])
        created_meal = Meal(id="meal1", date="2024-01-01", items=[], user_id=user_id)
        self.meal_repository.create.return_value = created_meal

        meal = self.use_case(meal_data=meal_data, user_id=user_id)

        self.meal_repository.create.assert_called_once()
        self.assertEqual(meal, created_meal)


class TestUpdateMealUseCase(unittest.TestCase):
    """Test updating a meal with ownership verification"""

    def setUp(self):
        self.meal_repository = MagicMock(spec=MealRepository)
        self.use_case = UpdateMealUseCase(self.meal_repository)

    def test_update_meal_success(self):
        """Test updating a meal when access is allowed"""
        meal_id = "meal1"
        user_id = "user123"
        meal_data = Meal(date="2024-01-02", items=[])
        existing_meal = Meal(id=meal_id, date="2024-01-01", items=[], user_id=user_id)
        updated_meal = Meal(id=meal_id, date="2024-01-02", items=[], user_id=user_id)

        self.meal_repository.read.return_value = [existing_meal]
        self.meal_repository.update.return_value = updated_meal

        meal = self.use_case(meal_id=meal_id, meal_data=meal_data, user_id=user_id)

        self.meal_repository.read.assert_called_once_with(id=meal_id, user_id=user_id)
        self.meal_repository.update.assert_called_once_with(
            meal_id,
            **meal_data.model_dump(exclude_unset=True, exclude={"user_id", "id"})
        )
        self.assertEqual(meal, updated_meal)

    def test_update_meal_access_denied(self):
        """Test updating a meal when access is denied"""
        meal_id = "meal1"
        user_id = "user123"
        meal_data = Meal(date="2024-01-02", items=[])

        self.meal_repository.read.return_value = []

        with self.assertRaises(AccessDeniedError):
            self.use_case(meal_id=meal_id, meal_data=meal_data, user_id=user_id)

        self.meal_repository.read.assert_called_once_with(id=meal_id, user_id=user_id)


class TestDeleteMealUseCase(unittest.TestCase):
    """Test deleting a meal with ownership verification"""

    def setUp(self):
        self.meal_repository = MagicMock(spec=MealRepository)
        self.use_case = DeleteMealUseCase(self.meal_repository)

    def test_delete_meal_success(self):
        """Test deleting a meal when access is allowed"""
        meal_id = "meal1"
        user_id = "user123"
        existing_meal = Meal(id=meal_id, date="2024-01-01", items=[], user_id=user_id)

        self.meal_repository.read.return_value = [existing_meal]

        self.use_case(meal_id=meal_id, user_id=user_id)

        self.meal_repository.read.assert_called_once_with(id=meal_id, user_id=user_id)
        self.meal_repository.delete.assert_called_once_with(existing_meal)

    def test_delete_meal_access_denied(self):
        """Test deleting a meal when access is denied"""
        meal_id = "meal1"
        user_id = "user123"

        self.meal_repository.read.return_value = []

        with self.assertRaises(AccessDeniedError):
            self.use_case(meal_id=meal_id, user_id=user_id)

        self.meal_repository.read.assert_called_once_with(id=meal_id, user_id=user_id)


class TestAddRemovePlanRecipeUseCases(unittest.TestCase):
    """Tests for adding/removing/planning recipes in meals"""

    def setUp(self):
        self.meal_repository = MagicMock(spec=MealRepository)
        self.add_use_case = AddRecipeToMealUseCase(self.meal_repository)
        self.remove_use_case = RemoveRecipeFromMealUseCase(self.meal_repository)
        self.plan_use_case = PlanRecipeUseCase(self.meal_repository)

    def test_add_recipe_to_existing_meal(self):
        meal_id = "meal1"
        user_id = "user123"
        existing_meal = Meal(id=meal_id, date="2024-01-01", items=[], user_id=user_id)
        self.meal_repository.read.return_value = [existing_meal]
        self.meal_repository.update.return_value = existing_meal

        entry = {"recipe_id": "r1", "title": "Pancakes", "servings": 2}
        res = self.add_use_case(meal_id, entry, user_id)

        self.meal_repository.read.assert_called_once_with(id=meal_id, user_id=user_id)
        self.meal_repository.update.assert_called_once()

    def test_remove_recipe_from_meal(self):
        meal_id = "meal1"
        user_id = "user123"
        existing_meal = Meal(id=meal_id, date="2024-01-01", items=[RecipeEntry(recipe_id="r1", servings=2)], user_id=user_id)
        self.meal_repository.read.return_value = [existing_meal]
        self.meal_repository.update.return_value = existing_meal

        self.remove_use_case(meal_id, "r1", user_id)

        self.meal_repository.read.assert_called_once_with(id=meal_id, user_id=user_id)
        self.meal_repository.update.assert_called_once()

    def test_plan_recipe_creates_or_updates(self):
        date = "2024-02-01"
        user_id = "user123"
        entry = {"recipe_id": "r1", "title": "Pancakes", "servings": 3}

        # No existing meal -> create
        self.meal_repository.read.return_value = []
        created = Meal(id="mnew", date=date, items=[RecipeEntry(**entry)], user_id=user_id)
        self.meal_repository.create.return_value = created

        res = self.plan_use_case(date, entry, user_id)
        self.meal_repository.read.assert_called_with(date=date, user_id=user_id)
        self.meal_repository.create.assert_called_once()

        # Existing meal -> update
        existing = Meal(id="m1", date=date, items=[], user_id=user_id)
        self.meal_repository.read.return_value = [existing]
        self.meal_repository.update.return_value = existing

        res2 = self.plan_use_case(date, entry, user_id)
        self.meal_repository.read.assert_called_with(date=date, user_id=user_id)
        self.meal_repository.update.assert_called_once()
