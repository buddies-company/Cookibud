"""GroceryList entity definitions"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class GroceryItem(BaseModel):
    """Grocery item definition"""
    id: Optional[str] = None
    name: str
    qty: Optional[float] = None
    unit: Optional[str] = None
    entries: List[str] = []
    bought: bool = False


class GroceryList(BaseModel):
    """Grocery list definition"""
    id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    title: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    items: List[GroceryItem] = []

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "period_start": "2025-11-01",
                "period_end": "2025-11-30",
                "items": [
                    {
                        "name": "Carrots",
                        "qty": 6,
                        "unit": "",
                        "entries": ["Carrots ×2: 3"],
                    }
                ],
            }
        }
    )
