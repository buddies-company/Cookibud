"""Meal API Router: defines HTTP endpoints for meal operations"""

from typing import Annotated

from adapters.ports.meal_repository import MealRepository
from drivers.dependencies import get_adapter_repository, get_token_header
from entities.meal import Meal
from entities.user import TokenData
from fastapi import APIRouter, Depends, HTTPException, status
from use_cases.exceptions import AccessDeniedError
from use_cases.meals import (
    CreateMealUseCase,
    DeleteMealUseCase,
    ReadMealByIdUseCase,
    ReadUserMealsUseCase,
    UpdateMealUseCase,
)

router = APIRouter()


def get_meal_usecases(token: Annotated[TokenData, Depends(get_token_header)]):
    """Dependency to inject meal use cases with user context"""
    repo: MealRepository = get_adapter_repository("meal", "mongodb")
    return {
        "read_user_meals": ReadUserMealsUseCase(repo),
        "read_meal_by_id": ReadMealByIdUseCase(repo),
        "create_meal": CreateMealUseCase(repo),
        "update_meal": UpdateMealUseCase(repo),
        "delete_meal": DeleteMealUseCase(repo),
    }, token.user_id


@router.get("")
def read_meals(usecases_and_user: tuple = Depends(get_meal_usecases)):
    """Retrieve meals for the authenticated user"""
    usecases, user_id = usecases_and_user
    return usecases["read_user_meals"](user_id)


@router.post("", status_code=201)
def create_meal(item: Meal, usecases_and_user: tuple = Depends(get_meal_usecases)):
    """Create a new meal for the authenticated user"""
    usecases, user_id = usecases_and_user
    return usecases["create_meal"](item, user_id)


@router.get("/{item_id}")
def read_meal(item_id: str, usecases_and_user: tuple = Depends(get_meal_usecases)):
    """Retrieve a meal by ID (only if owned by user)"""
    usecases, user_id = usecases_and_user
    try:
        return usecases["read_meal_by_id"](item_id, user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.put("/{item_id}")
def update_meal(
    item_id: str, item: Meal, usecases_and_user: tuple = Depends(get_meal_usecases)
):
    """Update a meal by ID (only if owned by user)"""
    usecases, user_id = usecases_and_user
    try:
        return usecases["update_meal"](item_id, item, user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.delete("/{item_id}", status_code=204)
def delete_meal(item_id: str, usecases_and_user: tuple = Depends(get_meal_usecases)):
    """Delete a meal by ID (only if owned by user)"""
    usecases, user_id = usecases_and_user
    try:
        usecases["delete_meal"](item_id, user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    return None  # 204 No Content
