"""Unit tests for grocery list use cases."""

import unittest
from unittest.mock import MagicMock

from adapters.ports.grocery_list_repository import GroceryListRepository
from entities.grocery_list import GroceryItem, GroceryList
from use_cases.grocery_lists import (
    CreateGroceryListUseCase,
    UpdateAllGroceryListItemsStatusUseCase,
    UpdateGroceryListItemStatusUseCase,
)


class TestCreateGroceryList(unittest.TestCase):
    def setUp(self):
        self.repo = MagicMock(spec=GroceryListRepository)
        self.use_case = CreateGroceryListUseCase(self.repo)

    def test_create_normalizes_units(self):
        items = [
            GroceryItem(name="Carrot", qty=1, unit="kg", entries=["Recipe A ×2: 1 kg"]),
            GroceryItem(
                name="Carrot", qty=500, unit="g", entries=["Recipe B ×1: 500 g"]
            ),
        ]
        gl = GroceryList(
            period_start="2025-11-01", period_end="2025-11-30", items=items
        )

        # Repository returns the same doc back
        self.repo.create.side_effect = lambda x: x

        saved = self.use_case(gl, "user-123")

        found = [it for it in saved.items if it.name == "Carrot"]
        # If normalization worked, the unit should be 'g' and qty 1000
        self.assertEqual(found[0].unit, "g")
        self.assertEqual(found[0].qty, 1000)


class TestUpdateGroceryItemStatus(unittest.TestCase):
    def setUp(self):
        self.repo = MagicMock(spec=GroceryListRepository)
        self.use_case = UpdateGroceryListItemStatusUseCase(self.repo)

    def test_update_item_status_success(self):
        item = GroceryItem(id="it-1", name="Carrot", qty=3, unit="", bought=False)
        gl = GroceryList(id="gl-1", user_id="user-123", items=[item])
        self.repo.read.return_value = [gl]
        self.repo.update.return_value = None
        self.repo.read.return_value = [gl]

        updated = self.use_case("gl-1", "it-1", True, "user-123")

        # Check update called with new items
        self.repo.update.assert_called()
        # Verify the updated items have the bought flag true
        updated_item = [i for i in updated.items if i.id == "it-1"][0]
        self.assertTrue(updated_item.bought)


class TestUpdateAllGroceryItemStatus(unittest.TestCase):
    def setUp(self):
        self.repo = MagicMock(spec=GroceryListRepository)
        self.use_case = UpdateAllGroceryListItemsStatusUseCase(self.repo)

    def test_update_all_items_status_success(self):
        items = [
            GroceryItem(id="it-1", name="A", qty=1, bought=False),
            GroceryItem(id="it-2", name="B", qty=2, bought=False),
        ]
        gl = GroceryList(id="gl-all-1", user_id="user-123", items=items)
        self.repo.read.return_value = [gl]

        updated = self.use_case("gl-all-1", True, "user-123")
        self.repo.update.assert_called()
        self.assertTrue(all(i.bought for i in updated.items))
