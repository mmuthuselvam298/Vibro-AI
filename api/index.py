import os
import sys

# Ensure the backend directory is in Python's module search path
current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.dirname(current_dir)
backend_dir = os.path.join(repo_root, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

# Import the existing FastAPI app from backend/app/main.py
from app.main import app

# Export for Vercel's ASGI/WSGI Python runner
__all__ = ["app"]
