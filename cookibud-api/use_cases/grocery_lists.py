"""Grocery list use cases with unit normalization and item status updates"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from adapters.ports.grocery_list_repository import GroceryListRepository
from entities.grocery_list import GroceryItem, GroceryList
from use_cases.exceptions import AccessDeniedError
from use_cases.units import normalize_unit_and_qty as _normalize_unit_and_qty

GROCERY_NOT_FOUND_OR_DENIED = "Grocery list not found or access denied"


@dataclass
class ReadUserGroceryListsUseCase:
    """Retrieve all grocery lists for a specific user"""

    grocery_repository: GroceryListRepository

    def __call__(self, user_id: str) -> list[GroceryList]:
        return self.grocery_repository.read(user_id=user_id)


@dataclass
class ReadGroceryListByIdUseCase:
    """Retrieve a grocery list by ID with ownership verification"""

    grocery_repository: GroceryListRepository

    def __call__(self, grocery_id: str, user_id: str) -> GroceryList | None:
        lists = self.grocery_repository.read(id=grocery_id, user_id=user_id)
        if not lists:
            raise AccessDeniedError(GROCERY_NOT_FOUND_OR_DENIED)
        return lists[0]


@dataclass
class CreateGroceryListUseCase:
    """Create a new grocery list for the authenticated user with unit normalization"""

    grocery_repository: GroceryListRepository

    def __call__(self, grocery_data: GroceryList, user_id: str) -> GroceryList:
        # Attach user id and created_at
        grocery_data.user_id = user_id
        # Use timezone-aware current time
        grocery_data.created_at = datetime.now().astimezone()
        # Normalize items
        normalized_items: list[GroceryItem] = []
        for item in grocery_data.items or []:
            # Ensure an id for each item
            if not item.id:
                item.id = str(uuid.uuid4())
            qty, unit = _normalize_unit_and_qty(item.qty, item.unit)
            ni = GroceryItem(
                id=item.id,
                name=item.name,
                qty=qty,
                unit=unit,
                entries=item.entries or [],
                bought=bool(item.bought),
            )
            normalized_items.append(ni)

        grocery_data.items = normalized_items
        saved = self.grocery_repository.create(grocery_data)
        return saved


@dataclass
class UpdateGroceryListItemStatusUseCase:
    """Update the 'bought' status of a specific item in a grocery list"""

    grocery_repository: GroceryListRepository

    def __call__(
        self, grocery_id: str, item_id: str, bought: bool, user_id: str
    ) -> GroceryList:
        lists = self.grocery_repository.read(id=grocery_id, user_id=user_id)
        if not lists:
            raise AccessDeniedError(GROCERY_NOT_FOUND_OR_DENIED)
        grocery: GroceryList = lists[0]
        updated_items = []
        found = False
        for it in grocery.items or []:
            if it.id == item_id:
                it.bought = bool(bought)
                found = True
            updated_items.append(it)

        if not found:
            raise AccessDeniedError("Item not found in grocery list")

        self.grocery_repository.update(grocery_id, items=updated_items)
        # Return modified list
        updated = self.grocery_repository.read(id=grocery_id, user_id=user_id)[0]
        return updated


@dataclass
class UpdateAllGroceryListItemsStatusUseCase:
    """Update the 'bought' status of all items in a grocery list"""

    grocery_repository: GroceryListRepository

    def __call__(self, grocery_id: str, bought: bool, user_id: str) -> GroceryList:
        lists = self.grocery_repository.read(id=grocery_id, user_id=user_id)
        if not lists:
            raise AccessDeniedError(GROCERY_NOT_FOUND_OR_DENIED)
        grocery: GroceryList = lists[0]
        updated_items = []
        for it in grocery.items or []:
            it.bought = bool(bought)
            updated_items.append(it)
        self.grocery_repository.update(grocery_id, items=updated_items)
        updated = self.grocery_repository.read(id=grocery_id, user_id=user_id)[0]
        return updated


@dataclass
class DeleteGroceryListUseCase:
    """Delete a grocery list with ownership verification"""

    grocery_repository: GroceryListRepository

    def __call__(self, grocery_id: str, user_id: str) -> None:
        lists = self.grocery_repository.read(id=grocery_id, user_id=user_id)
        if not lists:
            raise AccessDeniedError(GROCERY_NOT_FOUND_OR_DENIED)
        self.grocery_repository.delete(lists[0])
