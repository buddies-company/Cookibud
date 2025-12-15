import os
import shutil
from uuid import uuid4

from fastapi import APIRouter, File, UploadFile

from drivers.config import settings

router = APIRouter()


@router.post("")
def uploads_file(file: UploadFile = File(...)):
    """Upload a file and return its URL"""
    uploads_dir = settings.uploads_dir
    os.makedirs(uploads_dir, exist_ok=True)

    file_location = os.path.join(uploads_dir, f"{uuid4()}_{file.filename}")
    with open(file_location, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_url = f"/{file_location.replace(os.path.sep, '/')}"
    return {"file_url": file_url}


@router.delete("")
def delete_file(file_url: str):
    """Delete a file by its URL"""
    uploads_dir = settings.uploads_dir
    file_path = file_url.lstrip("/")

    if not file_path.startswith(uploads_dir):
        return {"detail": "Invalid file URL"}

    try:
        os.remove(file_path)
        return {"detail": "File deleted successfully"}
    except FileNotFoundError:
        return {"detail": "File not found"}
