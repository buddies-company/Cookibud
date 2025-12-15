"""Repository interface for grocery lists"""

from abc import ABC

from adapters.ports.crud import CRUD


class GroceryListRepository(CRUD, ABC):
    """Repository to handle grocery lists"""
