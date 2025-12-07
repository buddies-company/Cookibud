"""Custom exceptions for user-related errors in the use cases.
"""
from dataclasses import dataclass


@dataclass
class UserNotFoundError(Exception):
    """Raised when a user is not found in the repository"""
    username: str

    def __str__(self) -> str:
        return f"User not found: {self.username}"


@dataclass
class InvalidPasswordError(Exception):
    """Raised when an invalid password is provided for authentication"""
    username: str

    def __str__(self) -> str:
        return f"Invalid password for user: {self.username}"


@dataclass
class AlreadyExistingUser(Exception):
    """Raised when attempting to create a user that already exists"""
    message: str

    def __str__(self) -> str:
        return self.message


@dataclass
class AccessDeniedError(Exception):
    """Raised when user lacks permission to perform action (ownership check failed)"""

    message: str

    def __str__(self) -> str:
        return self.message
