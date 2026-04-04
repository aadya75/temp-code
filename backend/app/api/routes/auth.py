from fastapi import APIRouter, Header
import logging
from app.services.auth_service import AuthService
from app.models.auth import (
    SignUpRequest,
    SignInRequest,
    RefreshTokenRequest,
    AuthResponse,
    SessionResponse,
    RefreshResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Lazy-init: instantiated on first request so a bad config crashes with a
# clear 500 error rather than silently dropping the router at startup.
_auth_service: AuthService | None = None

def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service

@router.post("/signup", response_model=AuthResponse)
async def sign_up(request: SignUpRequest):
    result = await get_auth_service().sign_up(request.email, request.password)
    logger.info(f"Sign up result: success={result.get('success')}")
    return AuthResponse(**result)

@router.post("/signin", response_model=AuthResponse)
async def sign_in(request: SignInRequest):
    result = await get_auth_service().sign_in(request.email, request.password)
    logger.info(f"Sign in result: success={result.get('success')}")
    return AuthResponse(**result)

@router.post("/signout")
async def sign_out(authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    result = await get_auth_service().sign_out(token)
    logger.info(f"Sign out result: success={result.get('success')}")
    return result

@router.get("/session", response_model=SessionResponse)
async def get_session(authorization: str = Header(None)):
    if not authorization:
        return SessionResponse(success=False, user=None)
    token = authorization.replace("Bearer ", "")
    result = await get_auth_service().get_session(token)
    logger.info(f"Get session result: success={result.get('success')}")
    return SessionResponse(**result)

@router.post("/refresh", response_model=RefreshResponse)
async def refresh_session(request: RefreshTokenRequest):
    result = await get_auth_service().refresh_session(request.refresh_token)
    logger.info(f"Refresh result: success={result.get('success')}")
    return RefreshResponse(**result)