"""MongoDB connection module"""

from contextlib import AbstractContextManager

from pymongo import MongoClient


class Collection(AbstractContextManager):
    """Base class for MongoDB connection"""

    def __init__(self, uri: str, collection: str):
        """Initialize MongoDB client"""
        self.client = MongoClient(uri)
        self.database = self.client["Cookibud"]
        self.collection = self.database[collection]

    def __enter__(self):
        """Return the collection for use in a context manager"""
        return self.collection

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        """Close the MongoDB client connection"""
        self.client.close()
