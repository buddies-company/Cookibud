"""Fridge API Router: defines HTTP endpoints for fridge operations"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from adapters.ports.fridge_repository import FridgeRepository
from drivers.dependencies import get_adapter_repository, get_token_header
from entities.fridge import FridgeItem
from entities.user import TokenData
from use_cases.exceptions import AccessDeniedError
from use_cases.fridges import (
    AddFridgeItemUseCase,
    UpdateFridgeItemUseCase,
    MarkFridgeItemAsUsedUseCase,
    ReadFridgeItemsSortedByExpirationUseCase,
    ReadUserFridgeUseCase,
)

router = APIRouter()


def get_fridge_usecases(token: Annotated[TokenData, Depends(get_token_header)]):
    """Dependency to inject fridge use cases with user context"""
    repo: FridgeRepository = get_adapter_repository("fridge", "mongodb")
    return (
        {
            "read_user_fridge": ReadUserFridgeUseCase(repo),
            "add_item": AddFridgeItemUseCase(repo),
            "update_item": UpdateFridgeItemUseCase(repo),
            "mark_item_as_used": MarkFridgeItemAsUsedUseCase(repo),
            "read_items_sorted_by_expiration": ReadFridgeItemsSortedByExpirationUseCase(repo),
        },
        token.user_id,
    )


@router.get("")
def read_fridge(usecases_and_user: tuple = Depends(get_fridge_usecases)):
    """Retrieve the authenticated user's fridge (or create if not exists)"""
    usecases, user_id = usecases_and_user
    return usecases["read_user_fridge"](user_id)


@router.get("/sorted")
def read_fridge_sorted_by_expiration(
    usecases_and_user: tuple = Depends(get_fridge_usecases),
    sort_dir: str = "asc"
):
    """Retrieve the authenticated user's fridge items sorted by expiration date"""
    usecases, user_id = usecases_and_user
    try:
        items = usecases["read_items_sorted_by_expiration"](user_id, sort_dir)
        return {"items": items}
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.post("/items", status_code=201)
def add_fridge_item(
    item: FridgeItem,
    usecases_and_user: tuple = Depends(get_fridge_usecases)
):
    """Add a new item to the authenticated user's fridge"""
    usecases, user_id = usecases_and_user
    try:
        return usecases["add_item"](user_id, item)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.put("/items/{item_id}")
def update_fridge_item(
    item_id: str,
    item: FridgeItem,
    usecases_and_user: tuple = Depends(get_fridge_usecases)
):
    """Update an existing item in the authenticated user's fridge"""
    usecases, user_id = usecases_and_user
    try:
        return usecases["update_item"](user_id, item_id, item)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e





@router.patch("/items/{item_id}/mark-used", status_code=200)
def mark_fridge_item_as_used(
    item_id: str,
    usecases_and_user: tuple = Depends(get_fridge_usecases)
):
    """Mark an item as used (consumed) in the authenticated user's fridge"""
    usecases, user_id = usecases_and_user
    try:
        return usecases["mark_item_as_used"](user_id, item_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
