"""Fridge entity definitions"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class FridgeItem(BaseModel):
    """Fridge item definition"""

    id: Optional[str] = None
    name: str
    expiration_date: Optional[datetime] = None
    open_date: Optional[datetime] = None
    added_date: Optional[datetime] = None
    used: bool = False


class Fridge(BaseModel):
    """Fridge definition: user's fridge/pantry with ingredients and expiration dates"""

    id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[FridgeItem] = []

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "name": "Carrots",
                        "expiration_date": "2026-03-15T00:00:00Z",
                        "open_date": None,
                        "used": False,
                    },
                    {
                        "name": "Milk",
                        "expiration_date": "2026-03-08T00:00:00Z",
                        "open_date": "2026-02-28T00:00:00Z",
                        "used": False,
                    },
                ]
            }
        }
    )
