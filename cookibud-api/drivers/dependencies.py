"""Dependency injection module for FastAPI drivers."""

import importlib
from typing import Annotated, Literal

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from drivers.config import settings
from entities.user import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_token_header(token: Annotated[str, Depends(oauth2_scheme)]) -> TokenData:
    """decode given jwt"""
    try:
        payload: dict = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        return TokenData(**payload)
    except jwt.exceptions.InvalidSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        ) from exc
    except (jwt.exceptions.ExpiredSignatureError, jwt.exceptions.DecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="token has been expired"
        ) from exc


def get_adapter_repository(
    name: Literal["user", "recipe", "meal"], adapter: str = settings.adapter
):
    """Retrieve correct adapter class based on name

    name possible values : user
    """
    table_mapping = {
        "user": {"module": "user_repository", "class": "UserRepository"},
        "recipe": {"module": "recipe_repository", "class": "RecipeRepository"},
        "meal": {"module": "meal_repository", "class": "MealRepository"},
    }
    try:
        module_name = table_mapping.get(name).get("module")
        class_name = table_mapping.get(name).get("class")
        module = importlib.import_module(f"adapters.{adapter}.{module_name}")
        class_element = getattr(module, class_name)
        if adapter == "mongodb":
            return class_element(settings.mongo_uri)
        return class_element()
    except ModuleNotFoundError as exc:
        raise NameError(
            f"Repository for '{name}' not found. Searched 'adapters.{adapter}.{module_name}'"
        ) from exc
