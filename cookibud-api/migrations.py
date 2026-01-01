import logging
import os
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)


async def migrate_date_fields():
    mongo_url = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["Cookibud"]

    collection = db["GroceryLists"]

    # MongoDB type number 2 = "string"
    query = {"$or": [{"period_start": {"$type": 2}}, {"period_end": {"$type": 2}}]}

    count = 0
    async for doc in collection.find(query):
        update_data = {}

        if isinstance(doc.get("period_start"), str):
            try:
                update_data["period_start"] = datetime.fromisoformat(
                    doc["period_start"].replace("Z", "+00:00")
                )
            except ValueError:
                logger.error(
                    f"invalid date format for period_start: {doc['period_start']}"
                )

        if isinstance(doc.get("period_end"), str):
            try:
                update_data["period_end"] = datetime.fromisoformat(
                    doc["period_end"].replace("Z", "+00:00")
                )
            except ValueError:
                logger.error(f"invalid date format for period_end: {doc['period_end']}")

        if update_data:
            await collection.update_one({"_id": doc["_id"]}, {"$set": update_data})
            count += 1

    if count > 0:
        print(f"✅ Migration done : {count} documents updated.")
    else:
        print("ℹ️ No migration needed.")
