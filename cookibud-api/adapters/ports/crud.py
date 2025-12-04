from abc import ABC, abstractmethod


class CRUD(ABC):
    """Repository to handle crud"""

    @abstractmethod
    def read(self, **filters) -> list:
        """Retrieve elements"""

    @abstractmethod
    def create(self, element):
        """Add new element"""

    @abstractmethod
    def update(self, item_id, **modifications):
        """Modify element"""

    @abstractmethod
    def delete(self, item):
        """Delete element"""
