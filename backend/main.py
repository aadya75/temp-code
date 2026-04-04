# This file is intentionally minimal.
# The application entry point is run.py
# The FastAPI app is defined in app/main.py
from app.main import app  # re-export for tools that target backend/main.py:app