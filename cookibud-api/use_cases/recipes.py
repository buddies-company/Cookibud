"""Recipe management use cases"""

from dataclasses import dataclass

from adapters.ports.recipe_repository import RecipeRepository
from entities.recipe import Recipe
from use_cases.exceptions import AccessDeniedError


@dataclass
class ReadRecipesUseCase:
    """Retrieve recipes (public read - anyone can see)"""

    recipe_repository: RecipeRepository

    def __call__(self, search: str = None) -> list[Recipe]:
        """Get recipes with optional search filter"""
        if search:
            # Build a case-insensitive substring match for MongoDB
            # Using $regex with the search string and option 'i' for case-insensitive
            return self.recipe_repository.read(title={"$regex": search, "$options": "i"})
        return self.recipe_repository.read()


@dataclass
class ReadRecipeByIdUseCase:
    """Retrieve a recipe by ID (public read)"""

    recipe_repository: RecipeRepository

    def __call__(self, recipe_id: str) -> Recipe | None:
        """Get recipe by ID"""
        recipes = self.recipe_repository.read(id=recipe_id)
        if not recipes:
            return None
        return recipes[0]


@dataclass
class CreateRecipeUseCase:
    """Create a new recipe owned by the authenticated user"""

    recipe_repository: RecipeRepository

    def __call__(self, recipe_data: Recipe, user_id: str) -> Recipe:
        """Create recipe with automatic author_id association"""
        recipe_data.author_id = user_id
        return self.recipe_repository.create(recipe_data)


@dataclass
class UpdateRecipeUseCase:
    """Update a recipe with author ownership verification"""

    recipe_repository: RecipeRepository

    def __call__(self, recipe_id: str, recipe_data: Recipe, user_id: str) -> Recipe:
        """Update recipe if authored by user, raise AccessDeniedError otherwise"""
        existing_recipes = self.recipe_repository.read(id=recipe_id)
        if not existing_recipes:
            raise AccessDeniedError("Recipe not found")

        recipe: Recipe = existing_recipes[0]
        if recipe.author_id != user_id:
            raise AccessDeniedError("Only the author can update this recipe")

        return self.recipe_repository.update(recipe_id, **recipe_data)


@dataclass
class DeleteRecipeUseCase:
    """Delete a recipe with author ownership verification"""

    recipe_repository: RecipeRepository

    def __call__(self, recipe_id: str, user_id: str) -> None:
        """Delete recipe if authored by user, raise AccessDeniedError otherwise"""
        existing_recipes = self.recipe_repository.read(id=recipe_id)
        if not existing_recipes:
            raise AccessDeniedError("Recipe not found")

        recipe: Recipe = existing_recipes[0]
        if recipe.author_id != user_id:
            raise AccessDeniedError("Only the author can delete this recipe")

        self.recipe_repository.delete(recipe)


@dataclass
class GetIngredientNamesUseCase:
    """Return a deduplicated list of ingredient names from all recipes"""

    recipe_repository: RecipeRepository

    def __call__(self) -> list[str]:
        recipes: list[Recipe] = self.recipe_repository.read()
        names = set()
        for r in recipes:
            ingredients = r.ingredients
            if not ingredients:
                continue
            for ing in ingredients:
                name = ing.name
                if name:
                    names.add(name)
        return sorted(names)
