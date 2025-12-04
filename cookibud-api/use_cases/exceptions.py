# pylint: disable=missing-class-docstring
from dataclasses import dataclass


@dataclass
class UserNotFoundError(Exception):
    username: str

    def __str__(self) -> str:
        return f"User not found: {self.username}"


@dataclass
class InvalidPasswordError(Exception):
    username: str

    def __str__(self) -> str:
        return f"Invalid password for user: {self.username}"


@dataclass
class AlreadyExistingUser(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


@dataclass
class AccessDeniedError(Exception):
    """Raised when user lacks permission to perform action (ownership check failed)"""

    message: str

    def __str__(self) -> str:
        return self.message
