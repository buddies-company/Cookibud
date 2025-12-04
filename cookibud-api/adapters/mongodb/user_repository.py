"""MongoDB implementation of UserRepository"""

from adapters.mongodb.crud import CRUD
from adapters.ports.user_repository import UserRepository as IUserRepository
from entities.user import User


class UserRepository(CRUD, IUserRepository):
    """Repository to handle users"""

    def __init__(self, uri: str):
        super().__init__(uri, "Users", class_type=User)
