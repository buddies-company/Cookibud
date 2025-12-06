import unittest
from unittest.mock import MagicMock

from adapters.ports.recipe_repository import RecipeRepository
from entities.recipe import Recipe
from use_cases.exceptions import AccessDeniedError
from use_cases.recipes import (CreateRecipeUseCase, DeleteRecipeUseCase,
                               GetIngredientNamesUseCase,
                               ReadRecipeByIdUseCase, ReadRecipesUseCase,
                               UpdateRecipeUseCase)


class TestReadRecipes(unittest.TestCase):
    """Unit tests for ReadRecipesUseCase"""

    def setUp(self):
        self.recipe_repository = MagicMock(spec=RecipeRepository)
        self.use_case = ReadRecipesUseCase(self.recipe_repository)

    def test_read_recipes_no_search(self):
        """Test reading recipes without search filter"""
        expected_recipes = [
            Recipe(title="Pancakes", ingredients=[], description="Delicious pancakes."),
            Recipe(title="Omelette", ingredients=[], description="Fluffy omelette."),
        ]
        self.recipe_repository.read.return_value = expected_recipes

        recipes = self.use_case()

        self.recipe_repository.read.assert_called_once_with()
        self.assertEqual(recipes, expected_recipes)

    def test_read_recipes_with_search(self):
        """Test reading recipes with search filter"""
        search_term = "cake"
        expected_recipes = [
            Recipe(title="Pancakes", ingredients=[], description="Delicious pancakes.")
        ]
        self.recipe_repository.read.return_value = expected_recipes

        recipes = self.use_case(search=search_term)

        self.recipe_repository.read.assert_called_once_with(
            title={"$regex": search_term, "$options": "i"}
        )
        self.assertEqual(recipes, expected_recipes)


class TestReadRecipeById(unittest.TestCase):
    """Unit tests for ReadRecipeByIdUseCase"""

    def setUp(self):
        self.recipe_repository = MagicMock(spec=RecipeRepository)
        self.use_case = ReadRecipeByIdUseCase(self.recipe_repository)

    def test_read_recipe_by_id_found(self):
        """Test reading a recipe by ID when found"""
        recipe_id = "607f1f77bcf86cd799439011"
        expected_recipe = Recipe(
            title="Pancakes", ingredients=[], description="Delicious pancakes."
        )
        self.recipe_repository.read.return_value = [expected_recipe]

        recipe = self.use_case(recipe_id)

        self.recipe_repository.read.assert_called_once_with(id=recipe_id)
        self.assertEqual(recipe, expected_recipe)

    def test_read_recipe_by_id_not_found(self):
        """Test reading a recipe by ID when not found"""
        recipe_id = "607f1f77bcf86cd799439012"
        self.recipe_repository.read.return_value = []

        recipe = self.use_case(recipe_id)

        self.recipe_repository.read.assert_called_once_with(id=recipe_id)
        self.assertIsNone(recipe)


class TestRecipeCreateRecipe(unittest.TestCase):
    """Unit tests for CreateRecipeUseCase"""

    def setUp(self):
        self.recipe_repository = MagicMock(spec=RecipeRepository)
        self.use_case = CreateRecipeUseCase(self.recipe_repository)

    def test_create_recipe_success(self):
        """Test creating a recipe successfully"""
        recipe_data = {
            "title": "Muffins pomme amandes",
            "ingredients": [
                {"id": "refgdsxhgnbc", "name": "compote de pommes", "quantity": "100"},
                {"id": "grfbdxchmn", "name": "poudre d'amandes", "quantity": "25"},
            ],
            "description": "Delicious apple almond muffins.",
        }
        expected_recipe = Recipe(**recipe_data)
        self.recipe_repository.create.return_value = expected_recipe

        created_recipe = self.use_case(expected_recipe, user_id="user123")

        self.recipe_repository.create.assert_called_once_with(expected_recipe)

        self.assertEqual(created_recipe.title, expected_recipe.title)
        self.assertEqual(created_recipe.ingredients, expected_recipe.ingredients)

    def test_create_recipe_invalid_data(self):
        """Test creating a recipe with invalid data (e.g., missing title)"""
        invalid_recipe_data = {
            "title": "",
            "ingredients": [],
            "description": "Invalid recipe with no title.",
        }

        with self.assertRaises(ValueError) as context:
            self.use_case(Recipe(**invalid_recipe_data), user_id="user123")

        self.assertEqual(str(context.exception), "Recipe title cannot be empty.")


class TestUpdateRecipe(unittest.TestCase):
    """Unit tests for UpdateRecipeUseCase"""

    def setUp(self):
        self.recipe_repository = MagicMock(spec=RecipeRepository)
        self.use_case = UpdateRecipeUseCase(self.recipe_repository)

    def test_update_recipe_success(self):
        """Test updating a recipe successfully"""
        recipe_id = "607f1f77bcf86cd799439011"
        user_id = "user123"
        existing_recipe = Recipe(
            title="Pancakes",
            ingredients=[],
            description="Delicious pancakes.",
            author_id=user_id,
        )
        updated_data = Recipe(
            title="Banana Pancakes",
            ingredients=[],
            description="Delicious banana pancakes.",
        )

        self.recipe_repository.read.return_value = [existing_recipe]
        self.recipe_repository.update.return_value = updated_data

        updated_recipe = self.use_case(recipe_id, updated_data, user_id)

        self.recipe_repository.read.assert_called_once_with(id=recipe_id)
        self.recipe_repository.update.assert_called_once_with(
            recipe_id, **updated_data.model_dump(exclude_unset=True)
        )

        self.assertEqual(updated_recipe.title, updated_data.title)
        self.assertEqual(updated_recipe.description, updated_data.description)

    def test_update_recipe_not_found(self):
        """Test updating a recipe that does not exist"""
        recipe_id = "607f1f77bcf86cd799439012"
        user_id = "user123"
        updated_data = Recipe(
            title="Banana Pancakes",
            ingredients=[],
            description="Delicious banana pancakes.",
        )

        self.recipe_repository.read.return_value = []

        with self.assertRaises(AccessDeniedError) as context:
            self.use_case(recipe_id, updated_data, user_id)

        self.recipe_repository.read.assert_called_once_with(id=recipe_id)
        self.assertEqual(str(context.exception), "Recipe not found")

    def test_update_recipe_not_author(self):
        """Test updating a recipe by a user who is not the author"""
        recipe_id = "607f1f77bcf86cd799439011"
        user_id = "user123"
        existing_recipe = Recipe(
            title="Pancakes",
            ingredients=[],
            description="Delicious pancakes.",
            author_id="other_user",
        )
        updated_data = Recipe(
            title="Banana Pancakes",
            ingredients=[],
            description="Delicious banana pancakes.",
        )

        self.recipe_repository.read.return_value = [existing_recipe]

        with self.assertRaises(AccessDeniedError) as context:
            self.use_case(recipe_id, updated_data, user_id)

        self.recipe_repository.read.assert_called_once_with(id=recipe_id)
        self.assertEqual(
            str(context.exception), "Only the author can update this recipe"
        )


class TestDeleteRecipe(unittest.TestCase):
    """Unit tests for DeleteRecipeUseCase"""

    def setUp(self):
        self.recipe_repository = MagicMock(spec=RecipeRepository)
        self.use_case = DeleteRecipeUseCase(self.recipe_repository)

    def test_delete_recipe_success(self):
        """Test deleting a recipe successfully"""
        recipe_id = "607f1f77bcf86cd799439011"
        user_id = "user123"
        existing_recipe = Recipe(
            title="Pancakes",
            ingredients=[],
            description="Delicious pancakes.",
            author_id=user_id,
        )

        self.recipe_repository.read.return_value = [existing_recipe]

        self.use_case(recipe_id, user_id)

        self.recipe_repository.read.assert_called_once_with(id=recipe_id)
        self.recipe_repository.delete.assert_called_once_with(existing_recipe)

    def test_delete_recipe_not_found(self):
        """Test deleting a recipe that does not exist"""
        recipe_id = "607f1f77bcf86cd799439012"
        user_id = "user123"

        self.recipe_repository.read.return_value = []

        with self.assertRaises(AccessDeniedError) as context:
            self.use_case(recipe_id, user_id)

        self.recipe_repository.read.assert_called_once_with(id=recipe_id)
        self.assertEqual(str(context.exception), "Recipe not found")

    def test_delete_recipe_not_author(self):
        """Test deleting a recipe by a user who is not the author"""
        recipe_id = "607f1f77bcf86cd799439011"
        user_id = "user123"
        existing_recipe = Recipe(
            title="Pancakes",
            ingredients=[],
            description="Delicious pancakes.",
            author_id="other_user",
        )

        self.recipe_repository.read.return_value = [existing_recipe]

        with self.assertRaises(AccessDeniedError) as context:
            self.use_case(recipe_id, user_id)

        self.recipe_repository.read.assert_called_once_with(id=recipe_id)
        self.assertEqual(
            str(context.exception), "Only the author can delete this recipe"
        )


class TestGetIngredientNames(unittest.TestCase):
    """Unit tests for GetIngredientNamesUseCase"""

    def setUp(self):
        self.recipe_repository = MagicMock(spec=RecipeRepository)
        self.use_case = GetIngredientNamesUseCase(self.recipe_repository)

    def test_get_ingredient_names(self):
        """Test retrieving deduplicated ingredient names from recipes"""
        recipes = [
            Recipe(
                title="Recipe1",
                ingredients=[{"name": "Sugar"}, {"name": "Flour"}],
                description="",
            ),
            Recipe(
                title="Recipe2",
                ingredients=[{"name": "Flour"}, {"name": "Eggs"}],
                description="",
            ),
            Recipe(title="Recipe3", ingredients=[], description=""),
        ]
        self.recipe_repository.read.return_value = recipes

        ingredient_names = self.use_case()

        self.recipe_repository.read.assert_called_once_with()
        expected_names = {"Sugar", "Flour", "Eggs"}
        self.assertEqual(set(ingredient_names), expected_names)

    def test_get_ingredient_names_no_ingredients(self):
        """Test retrieving ingredient names when no recipes have ingredients"""
        recipes = [
            Recipe(title="Recipe1", ingredients=[], description=""),
            Recipe(title="Recipe2", ingredients=[], description=""),
        ]
        self.recipe_repository.read.return_value = recipes

        ingredient_names = self.use_case()

        self.recipe_repository.read.assert_called_once_with()
        self.assertEqual(ingredient_names, [])
