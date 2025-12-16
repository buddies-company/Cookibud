"""Recipe management use cases"""

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from adapters.ports.recipe_repository import RecipeRepository
from entities.recipe import Recipe, Review
from use_cases.exceptions import AccessDeniedError
from use_cases.units import normalize_unit_and_qty

NOT_FOUND = "Recipe not found"

@dataclass
class ReadRecipesUseCase:
    """Retrieve recipes (public read - anyone can see)"""

    recipe_repository: RecipeRepository

    def __call__(self, search: str = None, tags: list[str] | None = None, ingredient: str | None = None, page: int | None = None, page_size: int | None = None, sort_by: str | None = None, sort_dir: str = "asc") -> list[Recipe] | dict:
        """Get recipes with optional search, tag, or ingredient filters.

        - search: performs case-insensitive substring match against title, description or ingredient name
        - tags: list of tags to match (any match)
        - ingredient: match against ingredient name only
        """
        query: dict = {}
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"ingredients.name": {"$regex": search, "$options": "i"}},
            ]
        if tags:
            query["tags"] = {"$in": tags}
        if ingredient:
            query["ingredients.name"] = {"$regex": ingredient, "$options": "i"}

        if not (query or page):
            return self.recipe_repository.read()
        # when pagination is requested, perform paginated read and return metadata
        if page is not None and page_size is not None:
            # compute skip/limit
            skip = max(0, (page - 1) * page_size)
            # compute sort tuple if provided
            sort_param = None
            if sort_by:
                dir_flag = 1 if sort_dir == "asc" else -1
                sort_param = [(sort_by, dir_flag)]

            # compute total count by reading without pagination
            total_items = len(self.recipe_repository.read(**query))

            items = self.recipe_repository.read(**{**query, "_skip": skip, "_limit": page_size, "_sort": sort_param} if sort_param else {**query, "_skip": skip, "_limit": page_size})
            return {"items": items, "total": total_items, "page": page, "page_size": page_size}

        # no pagination requested: simple read (with optional sort)
        if sort_by:
            dir_flag = 1 if sort_dir == "asc" else -1
            return self.recipe_repository.read(**{**query, "_sort": [(sort_by, dir_flag)]})
        return self.recipe_repository.read(**query)


@dataclass
class GetTagsUseCase:
    """Return a deduplicated sorted list of tags used across recipes"""

    recipe_repository: RecipeRepository

    def __call__(self) -> list[str]:
        recipes: list[Recipe] = self.recipe_repository.read()
        tags = set()
        for r in recipes:
            for t in getattr(r, "tags", []) or []:
                if t:
                    tags.add(t)
        return sorted(tags)


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
        if not recipe_data.title:
            raise ValueError("Recipe title cannot be empty.")
        # normalize ingredient quantities if the recipe includes unit information
        normalized_ingredients = []
        for ing in recipe_data.ingredients or []:
            qty, unit = normalize_unit_and_qty(ing.quantity, getattr(ing, "unit", None))
            new_ing = ing.model_copy()
            new_ing.quantity = qty
            new_ing.unit = unit
            normalized_ingredients.append(new_ing)
        recipe_data.ingredients = normalized_ingredients
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
            raise AccessDeniedError(NOT_FOUND)

        recipe: Recipe = existing_recipes[0]
        if recipe.author_id != user_id:
            raise AccessDeniedError("Only the author can update this recipe")

        # Normalize ingredients if present in the update payload
        if recipe_data.ingredients is not None:
            normalized_ingredients = []
            for ing in recipe_data.ingredients:
                qty, unit = normalize_unit_and_qty(
                    ing.quantity, getattr(ing, "unit", None)
                )
                new_ing = ing.model_copy()
                new_ing.quantity = qty
                new_ing.unit = unit
                normalized_ingredients.append(new_ing)
            recipe_data.ingredients = normalized_ingredients

        return self.recipe_repository.update(
            recipe_id,
            **recipe_data.model_dump(exclude_unset=True, exclude={"author_id", "id"})
        )


@dataclass
class DeleteRecipeUseCase:
    """Delete a recipe with author ownership verification"""

    recipe_repository: RecipeRepository

    def __call__(self, recipe_id: str, user_id: str) -> None:
        """Delete recipe if authored by user, raise AccessDeniedError otherwise"""
        existing_recipes = self.recipe_repository.read(id=recipe_id)
        if not existing_recipes:
            raise AccessDeniedError(NOT_FOUND)

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


@dataclass
class AddReviewUseCase:
    """Add a review to a recipe"""
    recipe_repository: RecipeRepository

    def __call__(
        self,
        recipe_id: str,
        user_id: str,
        username: str,
        rating: int,
        comment: str | None,
    ) -> Review:
        # fetch recipe
        recipes = self.recipe_repository.read(id=recipe_id)
        if not recipes:
            raise ValueError(NOT_FOUND)
        recipe = recipes[0]
        # create review
        rev = Review(
            id=str(uuid4()),
            user_id=user_id,
            username=username,
            rating=int(rating),
            comment=comment,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        recipe.reviews = recipe.reviews or []
        recipe.reviews.append(rev)
        # persist
        self.recipe_repository.update(
            recipe_id,
            **recipe.model_dump(exclude_unset=True, exclude={"id", "author_id"})
        )
        # return the newly created review
        return rev
