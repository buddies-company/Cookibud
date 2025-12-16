"""Recipe API Router: defines HTTP endpoints for recipe operations"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from adapters.ports.recipe_repository import RecipeRepository
from drivers.dependencies import get_adapter_repository, get_token_header
from entities.recipe import Recipe
from entities.user import TokenData
from use_cases.exceptions import AccessDeniedError
from use_cases.recipes import (
    AddReviewUseCase,
    CreateRecipeUseCase,
    DeleteRecipeUseCase,
    GetIngredientNamesUseCase,
    ReadRecipeByIdUseCase,
    ReadRecipesUseCase,
    GetTagsUseCase,
    UpdateRecipeUseCase,
)

router = APIRouter()


def get_recipe_usecases():
    """Dependency to inject recipe use cases"""
    repo: RecipeRepository = get_adapter_repository("recipe", "mongodb")
    return {
        "read_recipes": ReadRecipesUseCase(repo),
        "read_recipe_by_id": ReadRecipeByIdUseCase(repo),
        "create_recipe": CreateRecipeUseCase(repo),
        "update_recipe": UpdateRecipeUseCase(repo),
        "delete_recipe": DeleteRecipeUseCase(repo),
        "add_review": AddReviewUseCase(repo),
        "get_ingredient_names": GetIngredientNamesUseCase(repo),
        "get_tags": GetTagsUseCase(repo),
    }


@router.get("")
def read_recipes(
    search: str | None = None,
    tags: str | None = None,
    ingredient: str | None = None,
    page: int | None = None,
    page_size: int | None = None,
    sort_by: str | None = None,
    sort_dir: str = "asc",
    usecases: dict = Depends(get_recipe_usecases),
):
    """Retrieve recipes. Optional filters: `search`, `tags`, `ingredient`. Optional pagination: `page`, `page_size`. Optional sorting: `sort_by`, `sort_dir` (asc|desc)."""
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    return usecases["read_recipes"](search, tag_list, ingredient, page, page_size, sort_by, sort_dir)


@router.get("/tags")
def read_tags(usecases: dict = Depends(get_recipe_usecases)):
    """Return all tags used in recipes"""
    return usecases["get_tags"]()


@router.post("", status_code=201)
def create_recipe(
    item: Recipe,
    token: Annotated[TokenData, Depends(get_token_header)],
    usecases: dict = Depends(get_recipe_usecases),
):
    """Create a new recipe (owned by authenticated user)"""
    return usecases["create_recipe"](item, token.user_id)


@router.get("/{item_id}")
def read_recipe(item_id: str, usecases: dict = Depends(get_recipe_usecases)):
    """Retrieve a recipe by ID"""
    return usecases["read_recipe_by_id"](item_id)


@router.get("/ingredient-names")
def get_ingredient_names(usecases: dict = Depends(get_recipe_usecases)):
    """Return a deduplicated sorted list of ingredient names"""
    return usecases["get_ingredient_names"]()


@router.put("/{item_id}")
def update_recipe(
    item_id: str,
    item: Recipe,
    token: Annotated[TokenData, Depends(get_token_header)],
    usecases: dict = Depends(get_recipe_usecases),
):
    """Update a recipe by ID (only if authored by user)"""
    try:
        return usecases["update_recipe"](item_id, item, token.user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.post("/{item_id}/reviews", status_code=201)
def add_review(
    item_id: str,
    payload: dict,
    token: Annotated[TokenData, Depends(get_token_header)],
    usecases: dict = Depends(get_recipe_usecases),
):
    """Add a review to a recipe (authenticated users)"""
    rating = int(payload.get("rating", 0))
    comment = payload.get("comment")
    if rating < 1 or rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5",
        )
    try:
        return usecases["add_review"](
            item_id, token.user_id, token.username or token.user_id, rating, comment
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.delete("/{item_id}", status_code=204)
def delete_recipe(
    item_id: str,
    token: Annotated[TokenData, Depends(get_token_header)],
    usecases: dict = Depends(get_recipe_usecases),
):
    """Delete a recipe by ID (only if authored by user)"""
    try:
        usecases["delete_recipe"](item_id, token.user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
