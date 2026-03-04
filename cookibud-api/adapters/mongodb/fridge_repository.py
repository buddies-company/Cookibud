"""MongoDB implementation of FridgeRepository"""

from adapters.mongodb.crud import CRUD
from adapters.ports.fridge_repository import FridgeRepository as IFridgeRepository
from entities.fridge import Fridge


class FridgeRepository(CRUD, IFridgeRepository):
    """Repository to handle fridges"""

    def __init__(self, uri: str):
        super().__init__(uri, "Fridges", class_type=Fridge)
