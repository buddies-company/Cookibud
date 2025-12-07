"""Repository interface for user operations"""

from abc import ABC

from adapters.ports.crud import CRUD


class UserRepository(CRUD, ABC):
    """Repository to handle users"""
