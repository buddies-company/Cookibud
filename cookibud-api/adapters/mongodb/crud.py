"""Base class for MongoDB CRUD operations"""

from bson import ObjectId
from pydantic import BaseModel

from adapters.mongodb.db import Collection
from adapters.ports.crud import CRUD as ICRUD


class CRUD(ICRUD):
    """Base class for MongoDB CRUD operations"""

    def __init__(self, uri: str, collection: str, class_type=None):
        self.uri = uri
        self.collection = collection
        self.class_type = class_type

    def read(self, **filters) -> list:
        """Retrieve elements"""
        # If caller filters by 'id', convert to MongoDB's '_id' with ObjectId
        if "id" in filters:
            val = filters.pop("id")
            # Use ObjectId.is_valid to avoid raising exceptions during conversion
            if ObjectId.is_valid(val):
                filters["_id"] = ObjectId(val)
            else:
                filters["_id"] = val
        # extract pagination/sort helpers if provided by callers
        limit = None
        skip = None
        sort = None
        if "_limit" in filters:
            limit = filters.pop("_limit")
        if "_skip" in filters:
            skip = filters.pop("_skip")
        if "_sort" in filters:
            sort = filters.pop("_sort")
        with Collection(self.uri, self.collection) as collection:
            documents = collection.find(filters)
            # apply sort/skip/limit if provided
            if sort:
                # sort should be a list of tuples [(field, direction)]
                documents = documents.sort(sort)
            if skip:
                documents = documents.skip(int(skip))
            if limit:
                documents = documents.limit(int(limit))
            return [self._document_to_entity(doc) for doc in documents]

    def create(self, element):
        """Add new element"""
        # Ensure we insert a plain dict/document into MongoDB.
        doc = self._to_document(element)
        with Collection(self.uri, self.collection) as collection:
            res = collection.insert_one(doc)
            # Return the created entity with id normalized
            doc["_id"] = res.inserted_id
            return self._document_to_entity(doc)

    def update(self, item_id, **modifications):
        """Modify element"""

        # Normalize modifications (e.g., BaseModel to dicts, lists of BaseModels to list of dicts)
        def _normalize_value(v):
            if isinstance(v, BaseModel):
                return v.dict()
            if isinstance(v, dict):
                return {kk: _normalize_value(vv) for kk, vv in v.items()}
            if isinstance(v, list):
                return [_normalize_value(e) for e in v]
            return v

        normalized_mods = {k: _normalize_value(v) for k, v in modifications.items()}

        with Collection(self.uri, self.collection) as collection:
            oid = ObjectId(item_id) if ObjectId.is_valid(item_id) else item_id
            collection.update_one({"_id": oid}, {"$set": normalized_mods})

    def delete(self, item):
        """Delete element"""
        # Accept either an object with attribute `id`, a dict with key `id`, or a raw id value.
        _id_val = None
        if isinstance(item, dict):
            _id_val = item.get("id") or item.get("_id")
        elif isinstance(item, BaseModel):
            _id_val = getattr(item, "id", None)
        else:
            # fallback: try attribute access
            _id_val = getattr(item, "id", None)

        if _id_val is None:
            # nothing to delete
            return

        if ObjectId.is_valid(_id_val):
            oid = ObjectId(_id_val)
        else:
            oid = _id_val

        with Collection(self.uri, self.collection) as collection:
            collection.delete_one({"_id": oid})

    def _document_to_entity(self, document):
        """Convert a MongoDB document to an entity (dictionary)"""
        if not document:
            return None

        if "_id" in document:
            document["id"] = str(document["_id"])
            del document["_id"]

        if self.class_type:
            return self.class_type(**document)
        return document

    def _to_document(self, element):
        """Normalize element into a plain dict suitable for insertion into MongoDB.

        Rules:
        - If element is a dict, return a shallow copy with 'id' removed.
        - If element is a Pydantic BaseModel, call .dict() and remove 'id'.
        - If element is an object with __dict__, use vars(element) and remove 'id'.
        - Otherwise return element as-is (caller may pass an already-valid document).
        """
        if element is None:
            return element

        if isinstance(element, dict):
            doc = dict(element)
        elif isinstance(element, BaseModel):
            doc = element.dict()
        elif hasattr(element, "__dict__"):
            doc = dict(vars(element))
        else:
            return element

        # Remove application-level 'id' before inserting; MongoDB will create _id.
        if "id" in doc:
            doc.pop("id", None)

        return doc
