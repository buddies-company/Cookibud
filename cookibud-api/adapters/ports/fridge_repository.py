"""Repository interface for fridge operations"""

from abc import ABC

from adapters.ports.crud import CRUD


class FridgeRepository(CRUD, ABC):
    """Repository to handle fridges"""
