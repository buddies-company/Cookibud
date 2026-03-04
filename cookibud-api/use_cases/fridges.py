"""Fridge use cases with item management"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from adapters.ports.fridge_repository import FridgeRepository
from entities.fridge import Fridge, FridgeItem
from use_cases.exceptions import AccessDeniedError

FRIDGE_NOT_FOUND_OR_DENIED = "Fridge not found or access denied"


@dataclass
class ReadUserFridgeUseCase:
    """Retrieve the fridge for a specific user (or create if not exists)"""

    fridge_repository: FridgeRepository

    def __call__(self, user_id: str) -> Fridge:
        fridges = self.fridge_repository.read(user_id=user_id)
        if not fridges:
            # Create a new fridge for this user if it doesn't exist
            new_fridge = Fridge(user_id=user_id, created_at=datetime.now().astimezone())
            return self.fridge_repository.create(new_fridge)
        return fridges[0]


@dataclass
class AddFridgeItemUseCase:
    """Add a new item to the user's fridge"""

    fridge_repository: FridgeRepository

    def __call__(self, user_id: str, item: FridgeItem) -> Fridge:
        fridges = self.fridge_repository.read(user_id=user_id)
        if not fridges:
            raise AccessDeniedError(FRIDGE_NOT_FOUND_OR_DENIED)
        fridge: Fridge = fridges[0]

        # Ensure item has an id
        if not item.id:
            item.id = str(uuid.uuid4())
        if not item.added_date:
            item.added_date = datetime.now().astimezone()

        normalized_item = FridgeItem(
            id=item.id,
            name=item.name,
            expiration_date=item.expiration_date,
            open_date=item.open_date,
            added_date=item.added_date,
            used=False,
        )

        fridge.items.append(normalized_item)
        self.fridge_repository.update(fridge.id, items=fridge.items)

        # Return updated fridge
        updated = self.fridge_repository.read(user_id=user_id)[0]
        return updated


@dataclass
class UpdateFridgeItemUseCase:
    """Update details of an existing fridge item"""

    fridge_repository: FridgeRepository

    def __call__(self, user_id: str, item_id: str, item: FridgeItem) -> Fridge:
        fridges = self.fridge_repository.read(user_id=user_id)
        if not fridges:
            raise AccessDeniedError(FRIDGE_NOT_FOUND_OR_DENIED)
        fridge: Fridge = fridges[0]

        updated_items: list[FridgeItem] = []
        found = False
        for it in fridge.items or []:
            if it.id == item_id:
                # preserve id, added_date, and used status
                updated = FridgeItem(
                    id=it.id,
                    name=item.name,
                    expiration_date=item.expiration_date,
                    open_date=item.open_date,
                    added_date=it.added_date,
                    used=it.used,
                )
                updated_items.append(updated)
                found = True
            else:
                updated_items.append(it)

        if not found:
            raise AccessDeniedError("Item not found in fridge")

        self.fridge_repository.update(fridge.id, items=updated_items)

        # Return updated fridge
        updated = self.fridge_repository.read(user_id=user_id)[0]
        return updated


@dataclass
class MarkFridgeItemAsUsedUseCase:
    """Mark an item as used in the user's fridge"""

    fridge_repository: FridgeRepository

    def __call__(self, user_id: str, item_id: str) -> Fridge:
        fridges = self.fridge_repository.read(user_id=user_id)
        if not fridges:
            raise AccessDeniedError(FRIDGE_NOT_FOUND_OR_DENIED)
        fridge: Fridge = fridges[0]

        # Find and update the item
        updated_items = []
        found = False
        for it in fridge.items or []:
            if it.id == item_id:
                it.used = True
                found = True
            updated_items.append(it)

        if not found:
            raise AccessDeniedError("Item not found in fridge")

        self.fridge_repository.update(fridge.id, items=updated_items)

        # Return updated fridge
        updated = self.fridge_repository.read(user_id=user_id)[0]
        return updated


@dataclass
class ReadFridgeItemsSortedByExpirationUseCase:
    """Retrieve fridge items sorted by expiration date"""

    fridge_repository: FridgeRepository

    def __call__(self, user_id: str, sort_dir: str = "asc") -> list[FridgeItem]:
        fridges = self.fridge_repository.read(user_id=user_id)
        if not fridges:
            raise AccessDeniedError(FRIDGE_NOT_FOUND_OR_DENIED)
        fridge: Fridge = fridges[0]

        # Sort items by expiration_date, handling None values (no expiration)
        # Items with no expiration date go to the end
        items_with_exp = [it for it in fridge.items if it.expiration_date is not None]
        items_without_exp = [it for it in fridge.items if it.expiration_date is None]

        # Sort by expiration date
        reverse = sort_dir == "desc"
        items_with_exp.sort(key=lambda x: x.expiration_date, reverse=reverse)

        # Combine: sorted items with expiration, then items without
        sorted_items = items_with_exp + items_without_exp
        return sorted_items
