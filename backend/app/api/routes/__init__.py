from .github import router as github_router
from .auth import router as auth_router

__all__ = ["github_router", "auth_router"]