"""Recipe API Router: defines HTTP endpoints for recipe operations"""

from typing import Annotated

from adapters.ports.recipe_repository import RecipeRepository
from drivers.dependencies import get_adapter_repository, get_token_header
from entities.recipe import Recipe
from entities.user import TokenData
from fastapi import APIRouter, Depends, HTTPException, status
from use_cases.exceptions import AccessDeniedError
from use_cases.recipes import (
    CreateRecipeUseCase,
    DeleteRecipeUseCase,
    GetIngredientNamesUseCase,
    ReadRecipeByIdUseCase,
    ReadRecipesUseCase,
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
        "get_ingredient_names": GetIngredientNamesUseCase(repo),
    }


@router.get("")
def read_recipes(
    search: str | None = None, usecases: dict = Depends(get_recipe_usecases)
):
    """Retrieve recipes. Optional `search` query param performs a case-insensitive title match."""
    return usecases["read_recipes"](search)


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
    return None  # 204 No Content
