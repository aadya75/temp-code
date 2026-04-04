from fastapi import APIRouter
from app.api.routes.github import router as github_router
from app.api.routes.auth import router as auth_router

api_router = APIRouter()
api_router.include_router(github_router, prefix="/github", tags=["github"])
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])