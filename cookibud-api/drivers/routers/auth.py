"""Authentication router for FastAPI."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from adapters.ports.user_repository import UserRepository
from drivers.config import settings
from drivers.dependencies import get_adapter_repository, get_token_header
from entities.user import Token, User
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from use_cases.auth import AuthUseCase, RegisterUseCase, RevokeUseCase
from use_cases.exceptions import (
    AlreadyExistingUser,
    InvalidPasswordError,
    UserNotFoundError,
)

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Encode data into JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


@router.post("/token")
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    """Connect user via form data and retrieve JWT"""
    user_repo: UserRepository = get_adapter_repository("user")
    try:
        user: User = AuthUseCase(user_repo)(form_data.username, form_data.password)
    except (UserNotFoundError, InvalidPasswordError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    access_token = create_access_token(
        data={"username": user.username, "user_id": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/auth/register", status_code=201)
def register(item: User):
    """Register a new user"""
    user_repo: UserRepository = get_adapter_repository("user")
    try:
        return RegisterUseCase(user_repo)(item)
    except AlreadyExistingUser as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


@router.delete(
    "/auth/revoke", status_code=200, dependencies=[Depends(get_token_header)]
)
def revoke(item: User, token_header=Depends(get_token_header)):
    """Revoke an existing user"""
    user_repo: UserRepository = get_adapter_repository("user")
    try:
        if token_header.user.username == item.username:
            return RevokeUseCase(user_repo)(item)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Operation not permitted",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
