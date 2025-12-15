"""MongoDB implementation of GroceryListRepository"""

from adapters.mongodb.crud import CRUD
from adapters.ports.grocery_list_repository import (
    GroceryListRepository as IGroceryListRepository,
)
from entities.grocery_list import GroceryList


class GroceryListRepository(CRUD, IGroceryListRepository):
    """Repository to handle grocery lists"""

    def __init__(self, uri: str):
        super().__init__(uri, "GroceryLists", class_type=GroceryList)
