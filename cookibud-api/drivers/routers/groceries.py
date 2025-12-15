"""Grocery lists API Router"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from adapters.ports.grocery_list_repository import GroceryListRepository
from drivers.dependencies import get_adapter_repository, get_token_header
from entities.grocery_list import GroceryList
from entities.user import TokenData
from use_cases.exceptions import AccessDeniedError
from use_cases.grocery_lists import (
    CreateGroceryListUseCase,
    DeleteGroceryListUseCase,
    ReadGroceryListByIdUseCase,
    ReadUserGroceryListsUseCase,
    UpdateAllGroceryListItemsStatusUseCase,
    UpdateGroceryListItemStatusUseCase,
)

router = APIRouter()


def get_grocery_usecases(token: Annotated[TokenData, Depends(get_token_header)]):
    """Dependency to inject grocery list use cases with user context"""
    repo: GroceryListRepository = get_adapter_repository("grocery_list", "mongodb")
    return (
        {
            "read_user_groceries": ReadUserGroceryListsUseCase(repo),
            "read_grocery_by_id": ReadGroceryListByIdUseCase(repo),
            "create_grocery": CreateGroceryListUseCase(repo),
            "update_item_status": UpdateGroceryListItemStatusUseCase(repo),
            "update_all_items_status": UpdateAllGroceryListItemsStatusUseCase(repo),
            "delete_grocery": DeleteGroceryListUseCase(repo),
        },
        token.user_id,
    )


@router.get("")
def read_groceries(usecases_and_user: tuple = Depends(get_grocery_usecases)):
    """Retrieve grocery lists for the authenticated user"""
    usecases, user_id = usecases_and_user
    return usecases["read_user_groceries"](user_id)


@router.post("", status_code=201)
def create_grocery(
    list_in: GroceryList, usecases_and_user: tuple = Depends(get_grocery_usecases)
):
    """Create a new grocery list for the authenticated user"""
    usecases, user_id = usecases_and_user
    return usecases["create_grocery"](list_in, user_id)


@router.get("/{grocery_id}")
def read_grocery(
    grocery_id: str, usecases_and_user: tuple = Depends(get_grocery_usecases)
):
    """Retrieve a grocery list by ID (only if owned by user)"""
    usecases, user_id = usecases_and_user
    try:
        return usecases["read_grocery_by_id"](grocery_id, user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.patch("/{grocery_id}/items/{item_id}")
def update_item_status(
    grocery_id: str,
    item_id: str,
    bought: bool,
    usecases_and_user: tuple = Depends(get_grocery_usecases),
):
    """Update the 'bought' status of a specific item in a grocery list"""
    usecases, user_id = usecases_and_user
    try:
        return usecases["update_item_status"](grocery_id, item_id, bought, user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.patch("/{grocery_id}/items")
def update_all_items_status(
    grocery_id: str,
    bought: bool,
    usecases_and_user: tuple = Depends(get_grocery_usecases),
):
    """Update the 'bought' status of all items in a grocery list"""
    usecases, user_id = usecases_and_user
    try:
        return usecases["update_all_items_status"](grocery_id, bought, user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.delete("/{grocery_id}", status_code=204)
def delete_grocery(
    grocery_id: str, usecases_and_user: tuple = Depends(get_grocery_usecases)
):
    """Delete a grocery list by ID (only if owned by user)"""
    usecases, user_id = usecases_and_user
    try:
        usecases["delete_grocery"](grocery_id, user_id)
    except AccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
